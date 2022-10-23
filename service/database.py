# from pysqlcipher3 import dbapi2 as sqlite
import sqlite3 as sqlite

import dbschema
import util

class Database(object):

    VERSION = '0.0.1'

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, type, value, tb):
        self.disconnect()
    
    def __init__(self, path=None, schemaname='mapdb'):
        self.path = path or 'map.db'
        self.dbschema = getattr(dbschema, schemaname)
        self.connection = None

    def connect(self):
        if self.connection is not None:
            self.disconnect()
        self.connection = sqlite.connect(self.path)
        # self.execute('PRAGMA key=%s', [self.password], fetch=False)
        # self.check_version()

    def disconnect(self):
        if self.connection is not None:
            self.connection.close()
            self.connection = None

    def create_tables(self):
        for table in self.dbschema.tables:
            self.create(table)

    def execute(self, query, params=None, fetch=True):
        params = params or []
        multiple_queries = type(query) == list
        cursor = self.connection.cursor()
        if not multiple_queries:
            params = [params]
            query = [query]

        results = []
        for q,p in zip(query, params):
            cursor.execute(q, p)
            results.append(cursor.fetchall())
        self.connection.commit()
        if not multiple_queries:
            return results[0]
        return results

    def select(self, query, params=None):
        return self.execute(query, params, fetch=True)

    def insert(self, query, params=None):
        self.execute(query, params, fetch=False)

    def update(self, query, params=None):
        self.insert(qeury, params)

    def create(self, query, params=None):
        self.insert(query, params)

    # def check_version(self):
    #     version = self.get_version
    #     if version != self.VERSION:
    #         updatestr = '{} to {}'.format(version, self.VERSION)
    #         # if self.auto_update and updatestr in self.dbschema.version_update:
    #         #     self.execute(*self.dbschema.version_update[version_str]) # TODO: this in dbschema
    #         raise ValueError('database is wrong version and cannot auto update ({})'.format(self.auto_update))

    def get_version(self):
        query = self.dbschema.select['version']
        return self.select(query)

    def set_version(self):
        if len(self.get_version()) > 0:
            query = self.dbschema.update['version']
        else:
            query = self.dbschema.insert['version']
        self.update(query, [self.VERSION])

    def insert_user(
        self,
        username: str,
        permission: str,
        token: str,
    ) -> None:
        params = (username, permission, token)
        self.insert('INSERT INTO users VALUES (NULL, ?, ?, ?)', params)

    def set_user_token(
        self,
        username: str,
        token,
    ) -> None:
        params = (token, username)
        self.execute('UPDATE users SET token=? WHERE username=?', params)

    def set_user_permission(
        self,
        username: str,
        permission: str,
    ) -> None:
        params = (permission, username)
        self.execute('UPDATE users SET permission=? WHERE username=?', params)

    def get_user_by_token(
        self,
        token: str,
    ):
        params = (token,)
        rows = self.select('SELECT * FROM users WHERE token=?', params)
        if len(rows) != 1:
            return None
        return rows[0]

    def delete_user(
        self,
        username: str,
    ) -> None:
        params = (username,)
        self.execute('DELETE FROM users WHERE username=?', params)

    def get_users(self):
        return self.select('SELECT * FROM users')

    def get_user(
        self,
        username: str,
    ):
        rows = self.select('SELECT * FROM users WHERE username=?', (username,))
        if len(rows) != 1:
            return None
        return rows[0]

    def user_exists(
        self,
        username: str,
    ) -> bool:
        return self.get_user(username) is not None

    def check_user_token(
        self,
        username: str,
        token: str,
    ) -> bool:
        rows = self.select('SELECT token FROM users WHERE username=?', (username,))
        if len(rows) != 1:
            return False

        real_token = rows[0]
        return token == real_token

    def get_map(self, map_name: str):
        return self.select('SELECT * FROM maps WHERE name=?', (map_name,))

    def insert_map(
        self,
        name: str,
    ) -> None:
        self.insert('INSERT INTO maps VALUES (NULL, ?)', (name,))

    def insert_monster(
        self,
        map_name: str,
        x: float,
        y: float,
        name: str,
        level: int,
        boss: bool,
        manual: bool = True,
    ) -> None:
        rows = self.get_map(map_name)
        if len(rows) != 1:
            raise ValueError('invalid map')
        map_id = rows[0][0]
        params = (map_id, x, y, name, level, int(boss), int(manual))
        self.insert('INSERT INTO monsters VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)', params)

    def delete_monster(
        self,
        x: float,
        y: float,
        map_name: str,
    ) -> None:
        rows = self.get_map(map_name)
        if len(rows) != 1:
            raise ValueError('invalid map')
        map_id = rows[0][0]
        params = (x, y, map_id)
        self.execute('DELETE FROM monsters WHERE x=? AND y=? AND map=?', params)

    def log(
        self,
        actor: str,
        action: str,
    ) -> None:
        user = self.get_user(actor)
        if user is None:
            raise ValueError('invalid user')
        params = (user[0], action)
        self.insert('INSERT INTO logs VALUES (NULL, ?, ?)', params)

    def meta_is_modified(self) -> bool:
        rows = self.select('SELECT * FROM meta')
        if len(rows) == 0:
            self.insert('INSERT INTO meta VALUES ()', [])
            row = self.select('SELECT * FROM meta')

        if len(rows) != 1:
            raise ValueError(f'invalid meta table: {len(meta)}')

        modified = rows[0][0]
        return bool(modified)

    def meta_set_modified(self, value: bool):
        rows = self.select('SELECT * FROM meta')
        if len(rows) == 0:
            self.insert('INSERT INTO meta VALUES (?)', (int(value),))
        else:
            self.execute('UPDATE meta SET modified=?', (int(value),))
        

    def insert_location(
        self,
        map_name: str,
        x: float,
        y: float,
        name: str,
        tomap: str,
        tox: float,
        toy: float,
        manual: bool = True,
    ) -> None:
        rows = self.get_map(map_name)
        if len(rows) != 1:
            raise ValueError('invalid map')
        map_id = rows[0][0]

        rows = self.get_map(tomap)
        if len(rows) != 1:
            raise ValueError('invalid map')
        tomap_id = rows[0][0]

        params = (map_id, x, y, name, tomap_id, tox, toy, int(manual))
        self.insert('INSERT INTO locations VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)', params)

    def delete_location(
        self,
        x: float,
        y: float,
        map_name: str,
    ) -> None:
        rows = self.get_map(map_name)
        if len(rows) != 1:
            raise ValueError('invalid map')
        map_id = rows[0][0]
        params = (x, y, map_id)
        self.execute('DELETE FROM locations WHERE x=? AND y=? AND map=?', params)

    def insert_icon(
        self,
        mapname: str,
        x: float,
        y: float,
        icon: str,
        mapgroup: str,
        name: str,
        manual: bool = True,
    ) -> None:
        rows = self.get_map(mapname)
        if len(rows) != 1:
            raise ValueError('invalid map')
        map_id = rows[0][0]
        params = (map_id, x, y, icon, mapgroup, name, int(manual))
        self.insert('INSERT INTO icons VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)', params)

    def delete_icon(
        self,
        map_name: str,
        x: float,
        y: float,
    ) -> None:
        rows = self.get_map(map_name)
        if len(rows) != 1:
            raise ValueError('invalid map')
        map_id = rows[0][0]
        params = (x, y, map_id)
        self.execute('DELETE FROM icons WHERE x=? AND y=? AND map=?', params)
        

    def ban_username(
        self,
        username: str,
    ) -> None:
        params = ('ban', username)
        self.insert('INSERT INTO moderation VALUES (NULL, ?, ?)', params)

    def get_bans(self):
        return set([x[0] for x in self.select('SELECT username FROM moderation WHERE action="ban"')])
