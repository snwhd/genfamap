import random
import string

PASSWORD_CHARSET = string.ascii_letters + string.digits

def random_password(self, length=40):
    return ''.join([ random.choice(PASSWORD_CHARSET) for _ in range(length) ])

