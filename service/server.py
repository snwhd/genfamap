#!/usr/bin/env python3
from werkzeug.wrappers import (
    Request as RequestBase,
    Response,
)
from werkzeug.exceptions import HTTPException, NotFound
from werkzeug.middleware.shared_data import SharedDataMiddleware
from werkzeug.routing import Map, Rule
from werkzeug.utils import (
    cached_property,
    redirect,
    send_file,
    escape,
)

from secure_cookie.cookie import SecureCookie

from jinja2 import Environment, FileSystemLoader
from datetime import datetime
from pathlib import Path
from enum import Enum
import argparse
import random
import string
import gzip
import json
import sys
import os

from exceptionlogger import log_exception
from database import Database

from secrets import COOKIE_SECRET

SESSION_COOKIE = 's'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'


def make_app():
    # return server to wsgi
    server = WebServer()
    server.run = SharedDataMiddleware(server.run, {
        '/static': os.path.join(os.path.dirname(__file__), 'static')
    })
    return server


class Permission(Enum):

    ADMIN = 'admin'
    EDITOR = 'editor'


class Request(RequestBase):

    @cached_property
    def session(self):
        data = self.cookies.get(SESSION_COOKIE)
        if not data:
            return SecureCookie(secret_key=COOKIE_SECRET)
        return SecureCookie.unserialize(data, COOKIE_SECRET)


class WebServer:
    
    def __enter__(self):
        return self

    def __exit__(self, type, value, traceback):
        pass

    def __call__(self, environ, start_response):
        return self.run(environ, start_response)

    def __init__(self):
        path = Path(os.path.dirname(__file__)) / 'templates'
        self.jinja_env = Environment(loader=FileSystemLoader(str(path.absolute())), autoescape=True)
        self.urlmap = Map([

            # map routes
            Rule('/', endpoint='world'),
            Rule('/1', endpoint='world1'),
            Rule('/2', endpoint='world2'),
            Rule('/fae', endpoint='fae'),
            Rule('/fairy', endpoint='fae'),
            Rule('/dungeon', endpoint='dungeon'),

            # editor/admin routes
            Rule('/gen', endpoint='gen_token'),
            Rule('/confirm', endpoint='confirm'),
            Rule('/control_panel', endpoint='control_panel'),

            # api routes
            Rule('/api/<action>', endpoint='api'),

            # other
            Rule('/favicon.ico', endpoint='favicon'),
        ])

        self.map_info = None

    #
    # RESPONSE UTILS
    #

    def json_response(self, j):
        """encode dict into a json response object"""
        r = Response(gzip.compress(bytes(json.dumps(j), 'utf-8'), 5))
        r.headers['Content-Type'] = 'application/json'
        r.headers['Content-Encoding'] = 'gzip'
        return r

    def render(self, name, **context):
        """render jinja template and return response object"""
        t = self.jinja_env.get_template(name)
        return Response(t.render(context), mimetype='text/html')

    #
    # REQUEST HANDLING
    #

    def ratelimit(
        self,
        request,
        action: str,
        timeout = 10,
        threshold = 3,
        throw=True,
    ) -> None:
        peer = request.remote_addr
        with Database() as db:
            tries = db.get_ratelimit(peer, action, limit=threshold)
            if len(tries) >= threshold:
                oldest = datetime.strptime(tries[-1], DATE_FORMAT)
                delta = (datetime.now() - oldest)
                if (delta.total_seconds() / 60) < timeout:
                    if throw:
                        raise ValueError('ratelimit')
                    return True

            # did not hit ratelimit, so add entry
            db.ratelimit(peer, action)
            return False

    def run(self, environ, start_response):
        """handle wsgi requests"""
        request = Request(environ)

        # check if session is revoked
        u = request.session.get('u')
        t = request.session.get('t')
        with Database() as db:
            revoked, before = db.revoked(u, t)
            if revoked:
                if 'u' in request.session: del request.session['u']
                if 't' in request.session: del request.session['t']
                if 'p' in request.session: del request.session['p']

        response = self.handle(request) or NotFound()
        if not isinstance(response, HTTPException):
            response.set_cookie(
                SESSION_COOKIE,
                request.session.serialize(),
                httponly=True,
                max_age=31536000,
            )
        return response(environ, start_response)

    def handle(self, request):
        """pass request object to appropriate handler and return response"""
        adapter = self.urlmap.bind_to_environ(request.environ)
        try:
            endpoint, values = adapter.match()
            response = getattr(self, 'handle_{}'.format(endpoint))(request, **values)
            return response
        except HTTPException as e:
            return e

    #
    # ENDPOINT HANDLERS
    #

    def handle_world(self, request):
        return self.return_map(request, 'world')

    def handle_world1(self, request):
        return self.return_map(request, 'world1')

    def handle_world2(self, request):
        return self.return_map(request, 'world2')

    def handle_fae(self, request):
        return self.return_map(request, 'fae')

    def handle_dungeon(self, request):
        return self.return_map(request, 'dungeon')

    def handle_favicon(self, request):
        return send_file('static/favicon.ico', request.environ)

    def return_map(self, request, name: str):
        is_admin = request.session.get('p') in (
            Permission.ADMIN.value,
            Permission.EDITOR.value,
        )
        is_test = request.args.get('test') is not None
        return self.render('map.html', admin=is_admin, is_test=is_test)

    def handle_confirm(self, request):
        """ confirm access tokens for editor/admin access """
        token = request.form.get('token')
        if token is not None:
            if self.ratelimit(request, 'confirm', throw=False):
                return self.render('confirm.html', error='Too Many Tries.')

            with Database() as db:
                user = db.get_user_by_token(token)
                if user is not None:
                    uid, name, perm, token = user
                    request.session['u'] = name
                    request.session['p'] = perm
                    request.session['t'] = datetime.now().strftime(DATE_FORMAT)
                    db.log(name, 'confirmed')
                    db.set_user_token(name, None)
                    return redirect('/')

            return self.render('confirm.html', error='Invalid Token')
        return self.render('confirm.html')

    def handle_gen_token(self, request):
        """ generate access tokens for editor/admin access """

        # requester's username
        username = request.session.get('u', None)
        if username is None:
            # no session -> reject
            return redirect('/')

        with Database() as db:
            user_data = db.get_user(username)
            if user_data is None:
                # user does not exist -> reject
                return redirect('/')

            permission = Permission(user_data[2])
            if permission != Permission.ADMIN:
                # not an admin session -> reject
                return self.render('token.html', token='access denied')

            # at this point, request has permission to generate tokens
            perm = request.form.get('permission')
            user = request.form.get('username')
            if perm is None or user is None:
                return self.render('token.html', token=None)

            try:
                # in case of invalid permission arg
                p = Permission(perm)
            except Exception as e:
                return self.render('token.html', token='invalid permission')

            # args are validated, generatea a new admin/editor token
            t = self.generate_token()
            if db.user_exists(user):
                db.log(username, f'gen_token_for : {user}')
                db.set_user_token(user, t)
                db.set_user_permission(user, p.value)
            else:
                db.log(username, f'gen_token_new_user : {user}')
                db.insert_user(user, p.value, t)

            return self.render('token.html', token=f'{user}:{p.value} - {t}')

    def generate_token(self) -> str:
        token_length = 12
        charset = string.ascii_letters + string.digits
        return ''.join(random.choices(charset, k=token_length))

    def handle_control_panel(self, request):
        u = request.session.get('u')
        p = request.session.get('p')
        if (p != Permission.ADMIN.value):
            print(f'access denied to control panel: {u} - {p}')
            return redirect('/')

        with Database() as db:
            # load some data to display in control panel
            bans = db.get_bans()
            users = [
                [
                    username,
                    permission,
                    (username in bans),
                    (token is None),
                    db.revoked(username, None)[1],
                 ]
                for _, username, permission, token in db.get_users()
            ]

            limit = request.args.get('logs', 25)
            logs = db.select('SELECT l.time, u.username, l.action FROM logs AS l JOIN users AS u ON l.actor = u.id ORDER BY l.time DESC LIMIT ?', (limit,))

        return self.render('control_panel.html', users=users, logs=logs)

    def handle_api(self, request, action):
        """ handle all api calls """

        # TODO: this method is overcomplicated, it should be split up into
        #       routing the request to actual api handlerrs.

        response = {}

        with Database() as db:
            bans = db.get_bans()

        def check_admin():
            if request.session.get('p') != Permission.ADMIN.value:
                raise ValueError('access denied')

        def check_editor():
            if (
                request.session.get('p') != Permission.ADMIN.value
                and request.session.get('p') != Permission.EDITOR.value
            ):
                raise ValueError('access denied')

        try:
            response['status'] = 'okay'

            # read-only APIs
            if action == 'map_info':
                with Database() as db:
                    if self.map_info is None or db.meta_is_modified():
                        self.recreate_map_info(db)
                        db.meta_set_modified(False)
                    assert self.map_info is not None
                    response['data'] = self.map_info
            elif action == 'retro':
                # okay, not read only...
                with Database() as db:
                    db.sponsor('retrommo', request.remote_addr)

            # all priv/write APIs below
            else:
                username = request.session.get('u')
                if username is None:
                    raise ValueError('no username accessing control panel')
                if username in bans:
                    raise ValueError('banned username accessing control panel')

                if action == 'add_monster':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    name = request.form.get('name')
                    level = request.form.get('level')
                    if None in (map_name, x, y, name, level):
                        raise ValueError(f'missing parameter')
                    x = float(x)
                    y = float(y)
                    level = int(level)
                    boss = False # TODO: submit boss in form
                    params = (map_name, x, y, name, level, boss)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        db.insert_monster(*params)
                        db.meta_set_modified(True)

                elif action == 'delete_monster':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    if None in (map_name, x, y):
                        raise ValueError(f'missing parameter')
                    x = float(x)
                    y = float(y)
                    params = (x, y, map_name)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        db.delete_monster(*params)
                        db.meta_set_modified(True)

                elif action == 'move_monster':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    tox = request.form.get('tox')
                    toy = request.form.get('toy')
                    if None in (map_name, x, y, tox, toy):
                        raise ValueError(f'missing parameter')

                    x = float(x)
                    y = float(y)
                    tox = float(tox)
                    toy = float(toy)
                    params = (tox, toy, x, y, map_name)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        monster = db.move_monster(*params)
                        if monster is None:
                            raise ValueError('no monster at position')
                        response['monsters'] = {
                            map_name: [{
                                'name': monster[4],
                                'level': monster[5],
                                'position': [ toy, tox ],
                                'boss': bool(monster[6]),
                            }]
                        }
                        db.meta_set_modified(True)

                elif action == 'add_location':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    name = request.form.get('name')
                    tomap = request.form.get('tomap')
                    tox = request.form.get('tox')
                    toy = request.form.get('toy')
                    if None in (map_name, x, y, name, tomap, tox, toy):
                        raise ValueError(f'missing parameter')
                    x = float(x)
                    y = float(y)
                    tox = float(tox)
                    toy = float(toy)
                    name = escape(name)
                    params = (map_name, x, y, name, tomap, tox, toy)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        db.insert_location(*params)
                        db.meta_set_modified(True)

                elif action == 'delete_location':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    if None in (map_name, x, y):
                        raise ValueError(f'missing parameter')
                    x = float(x)
                    y = float(y)
                    params = (x, y, map_name)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        db.delete_location(*params)
                        db.meta_set_modified(True)

                elif action == 'move_location':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    tox = request.form.get('tox')
                    toy = request.form.get('toy')
                    if None in (map_name, x, y, tox, toy):
                        raise ValueError(f'missing parameter')

                    x = float(x)
                    y = float(y)
                    tox = float(tox)
                    toy = float(toy)
                    params = (tox, toy, x, y, map_name)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        location = db.move_location(*params)
                        if location is None:
                            raise ValueError('no location at position')
                        response['locations'] = {
                            map_name: [{
                                'name': location[4],
                                'position': [ toy, tox ],
                                'destination': {
                                    'map': location[5],
                                    'position': [location[6], location[7]],
                                }
                            }]
                        }
                        db.meta_set_modified(True)

                elif action == 'add_icon':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    icon = request.form.get('icon')
                    name = request.form.get('name')
                    if None in (map_name, x, y, icon, name):
                        raise ValueError(f'missing parameter')
                    x = float(x)
                    y = float(y)
                    mapgroup = self.icon_to_mapgroup(icon)
                    params = (map_name, x, y, icon, mapgroup, name)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        db.insert_icon(*params)
                        db.meta_set_modified(True)

                    response['group'] = mapgroup

                elif action == 'delete_icon':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    if None in (map_name, x, y):
                        raise ValueError(f'missing parameter')
                    x = float(x)
                    y = float(y)
                    params = (map_name, x, y)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        db.delete_icon(*params)
                        db.meta_set_modified(True)

                elif action == 'move_icon':
                    check_editor()

                    map_name = request.form.get('map')
                    x = request.form.get('x')
                    y = request.form.get('y')
                    tox = request.form.get('tox')
                    toy = request.form.get('toy')
                    if None in (map_name, x, y, tox, toy):
                        raise ValueError(f'missing parameter')

                    x = float(x)
                    y = float(y)
                    tox = float(tox)
                    toy = float(toy)
                    params = (tox, toy, x, y, map_name)
                    log = f'{action} : {params}'
                    with Database() as db:
                        db.log(username, log)
                        icon = db.move_icon(*params)
                        if icon is None:
                            raise ValueError('no icon at position')
                        response['icons'] = {
                            map_name: [{
                                'icon': icon[4],
                                'group': icon[5],
                                'name': icon[6],
                                'position': [ toy, tox ],
                            }]
                        }
                        db.meta_set_modified(True)

                elif action == 'ban':
                    check_admin()

                    banned = request.form.get('username')
                    if banned is None:
                        raise ValueError('username not provided')
                    if banned == 'dan':
                        raise ValueError('dont ban dan')
                    log = f'{action} : {banned}'
                    with Database() as db:
                        db.log(username, log)
                        db.ban_username(banned)

                elif action == 'revoke':
                    check_admin()

                    revoked = request.form.get('username')
                    if revoked is None:
                        raise ValueError('username not provided')
                    if revoked == 'dan':
                        raise ValueError('dont revoke dan')

                    log = f'{action} : {revoked}'
                    with Database() as db:
                        db.log(username, log)
                        db.revoke(revoked)


        except Exception as e:
            response['status'] = 'error'
            response['exceptionid'] = log_exception(e)

        return self.json_response(response)

    def icon_to_mapgroup(self, icon):
        return {
            'bank':              'bank',
            'process_anvil':     'forging',
            'process_butchery':  'butchery',
            'process_cooking':   'cooking',
            'process_forge':     'forging',
            'process_pottery':   'crafting',
            'process_tailoring': 'tailoring',
            'process_water':     'cooking',
            'quest':             'quest',
            'resource_mine':     'mining',
            'resource_plant':    'botany',
            'resource_tree':     'tree',
            'store':             'shop',
        }[icon]

    def recreate_map_info(self, db: Database) -> None:
        icons = {}
        monsters = {}
        locations = {}

        maps = {
            mid: name
            for mid, name in db.select('SELECT id, name FROM maps')
        }

        for mid, mapid , x, y, name, level, boss, manual in db.select('SELECT * FROM monsters'):
            mapname = maps[mapid]
            if mapname not in monsters:
                monsters[mapname] = []
            monsters[mapname].append({
                'name': name,
                'level': level,
                'position': (y, x),
                'boss': bool(boss),
            })

        for lid, mapid, x, y, name, tomap, tox, toy, manual in db.select('SELECT * FROM locations'):
            mapname = maps[mapid]
            if mapname not in locations:
                locations[mapname] = []
            locations[mapname].append({
                'name': name,
                'position': (y, x),
                'destination': {
                    'map': maps[tomap],
                    'position': (tox, toy),
                },
            })

        for iid, mapid, x, y, icon, group, name, manual in db.select('SELECT * FROM icons'):
            mapname = maps[mapid]
            if mapname not in icons:
                icons[mapname] = []
            icons[mapname].append({
                'name': name,
                'position': (y, x),
                'icon': icon,
                'group': group,
            })

        self.map_info = {
            'icons': icons,
            'monsters': monsters,
            'locations': locations,
        }


if __name__ == '__main__':
    from werkzeug.serving import run_simple
    parser = argparse.ArgumentParser(description='web application for ctf practice.')
    parser.add_argument('-d', '--debug', action='store_true', help='set debug mode')
    parser.add_argument('-p', '--port', type=int, default=1337, help='listen port (default 1337)')
    args = parser.parse_args()

    with WebServer() as application:
        application.run = SharedDataMiddleware(application.run, {
            '/static': os.path.join(os.path.dirname(__file__), 'static')
        })
        run_simple('0.0.0.0', args.port, application, use_debugger=args.debug)
