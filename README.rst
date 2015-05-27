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

Quickstart
----------

First, set your app's secret key as an environment variable. For example, example add the following to ``.bashrc`` or ``.bash_profile``.

.. code-block:: bash

    export TRANSLATORSDESK_SECRET='something-really-secret'


Then run the following commands to bootstrap your environment.


::

    git clone --recursive https://github.com/spMohanty/translatorsdesk
    cd translatorsdesk
    pip install -r requirements/dev.txt
    python manage.py server

You will see a pretty welcome screen.

Once you have installed your DBMS, run the following to create your app's database tables and perform the initial migration:

::

    python manage.py db init
    python manage.py db migrate
    python manage.py db upgrade
    python manage.py server



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
