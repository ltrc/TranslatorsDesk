import aspell

"""
	Instantiates the aspell dictionaries
"""
en = aspell.Speller('lang', 'en')
hi = aspell.Speller('lang', 'hi')
te = aspell.Speller('lang', 'te')
ta = aspell.Speller('lang', 'ta')
pa = aspell.Speller('lang', 'pa')


dictionaries = {}
dictionaries['en'] = en
dictionaries['hi'] = hi
dictionaries['te'] = te
dictionaries['ta'] = ta
dictionaries['pa'] = pa