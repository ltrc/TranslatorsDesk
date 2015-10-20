import aspell

"""
	Instantiates the aspell dictionaries
"""
en = aspell.Speller('lang', 'en')
# hi = aspell.Speller('lang', 'hi') #Removing aspell-hi temporarily because of some funny error on Ubuntu
te = aspell.Speller('lang', 'te')
ta = aspell.Speller('lang', 'ta')
pa = aspell.Speller('lang', 'pa')


dictionaries = {}
dictionaries['en'] = en
# dictionaries['hi'] = hi
dictionaries['te'] = te
dictionaries['ta'] = ta
dictionaries['pa'] = pa