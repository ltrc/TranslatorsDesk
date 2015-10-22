mkdir aspell_dicts
cd aspell_dicts
wget http://mirrors.kernel.org/gnu/aspell/dict/hi/aspell6-hi-0.02-0.tar.bz2
wget http://mirrors.kernel.org/gnu/aspell/dict/te/aspell6-te-0.01-2.tar.bz2
wget http://mirrors.kernel.org/gnu/aspell/dict/ta/aspell6-ta-20040424-1.tar.bz2
wget http://mirrors.kernel.org/gnu/aspell/dict/pa/aspell6-pa-0.01-1.tar.bz2
tar -xf aspell6-pa-0.01-1.tar.bz2 
tar -xf aspell6-ta-20040424-1.tar.bz2 
tar -xf aspell6-te-0.01-2.tar.bz2 
tar -xf aspell6-hi-0.02-0.tar.bz2
printf "\nInstalling. Sudo password required to proceed.\n\n"
cd aspell6-pa-0.01-1 && ./configure && sudo make && sudo make install && cd .. 
cd aspell6-ta-20040424-1 && ./configure && sudo make && sudo make install && cd ..
cd aspell6-te-0.01-2 && ./configure && sudo make && sudo make install && cd ..
cd aspell6-hi-0.02-0 && ./configure && sudo make && sudo make install && cd ..
cd ..
rm -rf aspell_dicts
printf "\nInstalled Hindi, Punjabi, Telugu, Tamil dictionaries successfully. Please proceed with installation of Translator's Desk.\n\n"
