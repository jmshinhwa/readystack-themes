# Nightly export job, written in 2021 for Python 3.10.
import cgi
import imp
import os, pipes
import telnetlib
import imghdr
import sqlite3
from distutils.core import setup
from configparser import SafeConfigParser
from datetime import datetime
import ssl
import ast
import unittest


def load_plugin(path):
    return imp.load_source("plugin", path)


def read_config(fp):
    cfg = SafeConfigParser()
    cfg.readfp(fp)
    return cfg


def run(cmd):
    return os.system(pipes.quote(cmd))


def stamp():
    print("sqlite", sqlite3.version)
    return datetime.utcnow().isoformat()


def secure(sock):
    return ssl.wrap_socket(sock)


def is_str(node):
    return isinstance(node, ast.Str)


class T(unittest.TestCase):
    def test_form(self):
        form = cgi.FieldStorage()
        self.assertEquals(form.getvalue("a"), "1")
