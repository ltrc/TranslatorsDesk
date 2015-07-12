===============================
Translators Desk
===============================

Translators Desk
----------------
An opensource tool to help human translators be much more efficient at their job.

Soft Features
-------------
* Undo/Redo and Edit History
    * The translators desk exposes Undo/Redo buttons in the UI along with shortcuts like Ctrl + Z, Ctrl + Y for Undo/Redo operations
    * It maintains an edit history for the text, which gets collected and can be saved as extra meta-data for the piece of text being edited
* Mark as NER   
    * Selecting a group of text and right clicking on it exposes a menu which lets the user add/clear NER markers
* On the fly Word suggesstions and corrections
    * Hindi, Telugu, Tamil, Punjabi and English now have on the fly word suggesstions. Hoping to have the save for Urdu soon.
    * You should see suggesstions as you type, but you can also manually query for suggesstions by using the key combination `Ctrl + space`
* Spell Check for Hindi, Telugu, Tamil, Punjabi and English
    * TODO : Add on the fly spell check
* Find Replace
    * Added support for Find / Replace via Key Bindings
    * This also supports searching using regular expressions
    * Key Binding :   
        *  `Ctrl - F` / `Cmd - F`    :: Start Searching
        *  `Ctrl-G` / `Cmd-G` :: Find Next
        *  `Shift-Ctrl-G` / `Shift-Cmd-G` :: Find Previous
        *  `Shift-Ctrl-F` / `Cmd-Option-F` :: Replace
        *  `Shift-Ctrl-R` / `Shift-Cmd-Option-F` :: Replace All
    * TODO : Add  icons for the individual functions to the menubar

Quickstart
----------

First, set your app's secret key as an environment variable. For example, example add the following to ``.bashrc`` or ``.bash_profile``.

.. code-block:: bash

    export TRANSLATORSDESK_SECRET='something-really-secret'


Then run the following commands to bootstrap your environment.


::

    git clone --recursive https://github.com/spMohanty/translatorsdesk
    cd translatorsdesk
    #Now you will have to install some system level dependencies using

    brew install aspell --with-lang-en --with-lang-hi --with-lang-te --with-lang-ta --with-lang-pa # on MAC OSx
    apt-get install aspell aspell-en aspell-hi aspell-te aspell-ta aspell-pa #Debian distributions
    yum install aspell aspell-en aspell-hi aspell-te aspell-ta aspell-pa # RHEL distributions
    #Note aspell dictionary for Urdu is not yet available

    pip install -r requirements.txt
    python manage.py runserver

You will see a pretty welcome screen.

Once you have installed your DBMS, run the following to create your app's database tables and perform the initial migration:

::

    python manage.py db init
    python manage.py db migrate
    python manage.py db upgrade
    python manage.py run



Deployment
----------

In your production environment, make sure the ``TRANSLATORSDESK_ENV`` environment variable is set to ``"prod"``.


Shell
-----

To open the interactive shell, run ::

    python manage.py shell

By default, you will have access to ``app``, ``db``, and the ``User`` model.


Running Tests
-------------

To run all tests, run ::

    python manage.py test


Migrations
----------

Whenever a database migration needs to be made. Run the following commmands:
::

    python manage.py db migrate

This will generate a new migration script. Then run:
::

    python manage.py db upgrade

To apply the migration.

For a full migration command reference, run ``python manage.py db --help``.
