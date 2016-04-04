# -*- coding: utf-8 -*-
"""
Created on Wed Mar 23 10:39:32 2016

@author: nausheenfatma
"""

def search_suggestions(word,index_path):
    
    primary_file=index_path+"primary.txt" #primary.txt in the primary index 
    primary_file=open(primary_file,"r")
    search_word=word
    previous_address=index_path+"secondary/aa" #default=secondary index 1st file 
    suggestions=[]
    
    word_options=[]
    
    for line in primary_file: 
        
        line=line.rstrip()
        line=line.split("###")
        index_word=line[0]
        secondary_index_address=line[1].split(":")[1]
        
        if(search_word > index_word):
            previous_address=index_path+secondary_index_address
        else :
            secondary=open(previous_address,"r")
            list_of_tertiary_addresses=[]
            for secondary_line in secondary :  #goto previous address 
                #print secondary_line
                secondary_line=secondary_line.rstrip()
                secondary_line_tokens=secondary_line.split("###")
                tertiary_file_path=secondary_line_tokens[1].split(":")[1]
                list_of_tertiary_addresses.append(tertiary_file_path)
            flag=True
            for address in  list_of_tertiary_addresses:
                #print address
                for tertiary_line in open(index_path+address,"r") :
                    #print tertiary_line
                    tertiary_line=tertiary_line.rstrip()
                    tertiary_line_tokens=tertiary_line.split("###")
                    tertiary_index_word=tertiary_line_tokens[0]   
                    tertiary_index_probability=tertiary_line_tokens[1]
                    if (tertiary_index_word.startswith(search_word)):
                        word_options.append([tertiary_index_word,float(tertiary_index_probability)])
                    elif (tertiary_index_word >search_word and not(tertiary_index_word.startswith(search_word)) ):
                        flag=False
                        break
                if not flag:        
                    break
            break
        
    if len(word_options)>0:
            word_options.sort(key=lambda x: x[1],reverse=True)
            
    for word in word_options:
                suggestions.append([word[0],word[1]])
    return suggestions
            
       
        
    