import aspell

"""
	Instantiates the aspell dictionaries
"""
en = aspell.Speller(('lang', 'en'), ('encoding', 'utf-8'))
hi = aspell.Speller(('lang', 'hi'), ('encoding', 'utf-8'))
te = aspell.Speller(('lang', 'te'), ('encoding', 'utf-8'))
ta = aspell.Speller(('lang', 'ta'), ('encoding', 'utf-8'))
pa = aspell.Speller(('lang', 'pa'), ('encoding', 'utf-8'))

dictionaries = {}
dictionaries['en'] = en
dictionaries['hi'] = hi
dictionaries['te'] = te
dictionaries['ta'] = ta
dictionaries['pa'] = pa

