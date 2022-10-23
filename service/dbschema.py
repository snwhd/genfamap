class Map(dict):

    def __init__(self, *args, **kwargs):
        super(Map, self).__init__(*args, **kwargs)
        for arg in args:
            if isinstance(arg, dict):
                for k, v in arg.items():
                    self[k] = v

        if kwargs:
            for k, v in kwargs.items():
                self[k] = v

    def __getattr__(self, attr):
        return self.get(attr)

    def __setattr__(self, key, value):
        self.__setitem__(key, value)

    def __setitem__(self, key, value):
        super(Map, self).__setitem__(key, value)
        self.__dict__.update({key: value})

    def __delattr__(self, item):
        self.__delitem__(item)

    def __delitem__(self, key):
        super(Map, self).__delitem__(key)
        del self.__dict__[key]

definitions = {
    'tables': [
        '''CREATE TABLE IF NOT EXISTS database_version (
            version STRING NOT NULL
        )''',
        '''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username STRING UNIQUE NOT NULL,
            permission STRING NOT NULL,
            token STRING UNIQUE
        )''',
        '''CREATE TABLE IF NOT EXISTS moderation (
            id INTEGER PRIMARY KEY,
            action STRING NOT NULL,
            username STRING NOT NULL
        )''',
        '''CREATE TABLE IF NOT EXISTS maps (
            id INTEGER PRIMARY KEY,
            name STRING NOT NULL
        )''',
        '''CREATE TABLE IF NOT EXISTS monsters (
            id INTEGER PRIMARY KEY,
            map INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            name STRING NOT NULL,
            level INTEGER NOT NULL,
            boss INTEGER NOT NULL,
            manual INTEGER NOT NULL,

            FOREIGN KEY(map) REFERENCES maps(id)
        )''',
        '''CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY,
            map INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            name STRING NOT NULL,
            tomap INTEGER NOT NULL,
            tox REAL NOT NULL,
            toy REAL NOT NULL,
            manual INTEGER NOT NULL,

            FOREIGN KEY(map) REFERENCES maps(id),
            FOREIGN KEY(tomap) REFERENCES maps(id)
        )''',
        '''CREATE TABLE IF NOT EXISTS meta (
            modified INTEGER DEFAULT 1
        )''',
        '''CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY,
            actor INTEGER NOT NULL,
            action STRING NOT NULL,

            FOREIGN KEY(actor) REFERENCES users(id)
        )''',
        '''Create TABLE IF NOT EXISTS icons (
            id INTEGER PRIMARY KEY,
            map INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            icon STRING NOT NULL,
            mapgroup STRING NOT NULL,
            name STRING NOT NULL,
            manual INTEGER NOT NULL,

            FOREIGN KEY(map) REFERENCES maps(id)
        )''',
    ],
}

mapdb = Map(**definitions)
