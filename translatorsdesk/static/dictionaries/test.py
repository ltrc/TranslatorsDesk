#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json

f = open("hin_urd.parallel")
h, u = json.loads(f.read())
print h.keys()[1]
print h['बेहयाई'.decode('utf-8')]