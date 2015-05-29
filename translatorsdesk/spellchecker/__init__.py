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


##Collect and store respective encoding names
## TO-DO :: Write custom encoders for u-deva, u-telu, u-taml, u-guru
dictionaries["encodings"] = {}
for k in dictionaries.keys():
	if k == "encodings":
		continue

	aspell_obj = dictionaries[k]	
	for items in aspell_obj.ConfigKeys():
		if items[0] == "encoding":
			dictionaries["encodings"][k] = items[2]