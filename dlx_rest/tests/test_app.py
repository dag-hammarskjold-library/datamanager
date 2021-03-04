import os
os.environ['DLX_REST_TESTING'] = 'True'
import pytest 
import json, re
from dlx_rest.config import Config
from dlx_rest.forms import LoginForm
from flask_login import LoginManager, current_user, login_user, login_required, logout_user

PRE = 'http://localhost/'

def test_testing():
    assert Config.TESTING == True
    assert Config.connect_string == 'mongomock://localhost'

# Index page
def test_index(client):
    response = client.get(PRE)
    assert response.status_code == 200

# User session management
'''
def test_get_register_page(client):
    response = client.get(PRE + '/register')
    assert response.status_code == 200
'''
'''
def test_post_register_data(client):
    email
    response = client.post(PRE + '/register', data={
        'email'
    })
'''
def login(client, username, password):
    return client.post(PRE + '/login', data = {'email': username, 'password': password}, follow_redirects=True)

def logout(client):
    return client.get(PRE + '/logout', follow_redirects=True)

def test_login(client, users, default_users):
    # Get the login form
    response = client.get(PRE + '/login')
    assert response.status_code == 200

    user = default_users['admin']
    rv = login(client, user['email'], user['password'])
    assert rv.status_code == 200
    assert b'Logged in successfully' in rv.data

    logout(client)

    # Incorrect login
    user = default_users['invalid']
    rv = login(client, user['email'], user['password'])
    assert rv.status_code == 200
    assert b'Invalid username or password' in rv.data

def test_logout(client):
    #response = client.get(PRE + '/logout')
    # Logout should always redirect
    #assert response.status_code == 302
    rv = logout(client)
    assert rv.status_code == 200
    assert b'Logged out successfully' in rv.data

# Administration
# All of these should work only if authenticated.
def test_admin(client, default_users):
    # Unauthenticated. This should give a 403 for unauthorized users.
    response = client.get(PRE + '/admin')
    assert response.status_code == 403

    # Authenticated, non-admin user
    user = default_users['non-admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin')
    assert response.status_code == 403

    logout(client)

    # Authenticated, admin user
    user = default_users['admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin')
    assert response.status_code == 200

    logout(client)

def test_list_users(client, default_users):
    # Unauthenticated. This should give a 403 for unauthorized users.
    response = client.get(PRE + '/admin/users')
    assert response.status_code == 403

    # Authenticated, non-admin user
    user = default_users['non-admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users')
    assert response.status_code == 403

    logout(client)

    # Authenticated, admin user
    user = default_users['admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users')
    assert response.status_code == 200

    logout(client)

def test_create_user(client, default_users):
    # Unauthenticated. This should give a 403 for unauthorized users.
    response = client.get(PRE + '/admin/users/new')
    assert response.status_code == 403

    response = client.post(PRE + '/admin/users/new', data={
        'email': 'new_test_user@un.org', 'password': 'password'
    })
    assert response.status_code == 403

    # Authenticated, unauthorized user.
    user = default_users['non-admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users/new')
    assert response.status_code == 403

    response = client.post(PRE + '/admin/users/new', data={
        'email': 'new_test_user@un.org', 'password': 'password'
    })
    assert response.status_code == 403

    logout(client)

    # Authenticated, authorized user
    user = default_users['admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users/new')
    assert response.status_code == 200

    new_user = default_users['new']
    response = client.post(PRE + '/admin/users/new', data={
        'email': new_user['email'], 'password': new_user['password']
    })
    assert response.status_code == 302

    logout(client)

    # Verify our newly created user
    from dlx_rest.models import User
    user = User.objects.filter(email=new_user['email'])
    assert len(user) > 0
    assert user[0].email == new_user['email']


def test_update_user(client, users, default_users):
    from dlx_rest.models import User
    admin_user = default_users['admin']
    edited_user = User.objects.get(email=default_users['non-admin']['email'])

    # Unauthenticated. This should give a 403 for unauthorized users.
    response = client.get(PRE + '/admin/users/{}/edit'.format(str(edited_user.id)))
    assert response.status_code == 403

    response = client.post(PRE + '/admin/users/{}/edit'.format(str(edited_user.id)), data={
        'email':'foo@bar.com', 'password': 'password'
    })
    assert response.status_code == 403

    # Authenticated, but unauthorized.
    user = default_users['non-admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users/{}/edit'.format(str(edited_user.id)))
    assert response.status_code == 403

    response = client.post(PRE + '/admin/users/{}/edit'.format(str(edited_user.id)), data={
        'email':'foo@bar.com', 'password': 'password'
    })
    assert response.status_code == 403
    logout(client)

    # Authenticated, authorized
    user = default_users['admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users/{}/edit'.format(str(edited_user.id)))
    assert response.status_code == 200

    response = client.post(PRE + '/admin/users/{}/edit'.format(str(edited_user.id)), data={
        'email':'foo@bar.com', 'password': 'password'
    })
    assert response.status_code == 302
    logout(client)

    user = User.objects.filter(email='foo@bar.com')
    assert len(user) > 0
    assert user[0].email == 'foo@bar.com'

def test_delete_user(client, users, default_users):
    from dlx_rest.models import User
    deleted_user = User.objects.get(email=default_users['new']['email'])
    current_user_count = len(User.objects)

    # Unauthenticated. This should give a 403 for unauthorized users.
    response = client.get(PRE + '/admin/users/{}/delete'.format(str(deleted_user.id)))
    assert response.status_code == 403

    # Authenticated, unauthorized
    user = default_users['new']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users/{}/delete'.format(str(deleted_user.id)))
    assert response.status_code == 403
    logout(client)

    # Authenticated, authorized
    user = default_users['admin']
    login(client, user['email'], user['password'])
    response = client.get(PRE + '/admin/users/{}/delete'.format(str(deleted_user.id)))
    assert response.status_code == 302
    logout(client)

    assert len(User.objects) == current_user_count - 1
    user = User.objects.filter(email=deleted_user['email'])
    assert len(user) == 0