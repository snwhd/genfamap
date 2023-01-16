from database import Database, DATE_FORMAT


def init():
    with Database() as db:
        db.create_tables()


def backup():

    from datetime import datetime
    import subprocess

    cmd = ['cp', 'map.db', f'backups/{datetime.now()}.db']
    subprocess.check_output(cmd)
