# -*- coding: utf-8 -*-
"""
Created on Wed Mar 23 16:27:03 2016

@author: nausheenfatma

file for suggesting word sugggestions input side,during typing
"""

from search_word_in_index import search_suggestions

unigram_index_path="lib/spell_suggest/unigram_index/"
bigram_index_path="lib/spell_suggest/bigram_index/"


class BigramSpellSuggestion:
  
	def find_candidate_word_for_word_prediction(self,bigram):
		suggestions = []

		if len(bigram) > 1:
			string_to_match=bigram[-2]+"_"+bigram[-1]
			suggestions=search_suggestions(string_to_match, bigram_index_path)


		elif len(bigram) == 1:
			string_to_match=bigram[-1]
			suggestions=search_suggestions(string_to_match, unigram_index_path)
		
		final_suggestions = []
		for suggestion in suggestions:
				final_suggestions.append(suggestion[0].split('_')[-1])
		return final_suggestions
    

def main():
	m=BigramSpellSuggestion()
	print m.find_candidate_word_for_word_prediction( ("अरब", "ली") )
 
if __name__ == '__main__':
	main()
