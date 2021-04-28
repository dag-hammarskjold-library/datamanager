import os
os.environ['DLX_REST_TESTING'] = 'True'

import pytest 
import json, re
from dlx_rest.config import Config

API = 'http://localhost/api'

# make sure the db is mocked before committing test data
if Config.connect_string != 'mongomock://localhost':
    raise Exception

# tests

#setup()
    
def test_testing():
    assert Config.TESTING == True
    assert Config.connect_string == 'mongomock://localhost'
    
def test_app(client):
    assert type(client).__name__ == 'FlaskClient'

def test_all_routes(client):
    pass

def test_collections_list(client, records):
    data = json.loads(client.get(f'{API}/collections').data)
    assert len(data['results']) == 3
    assert f'{API}/bibs' in data['results']
    assert f'{API}/auths' in data['results']
    
def test_records_list(client, records):
    data = json.loads(client.get(f'{API}/bibs').data)
    assert len(data['results']) == 10
    
    data = json.loads(client.get(f'{API}/auths').data)
    assert len(data['results']) == 11
    
    data = json.loads(client.get(f'{API}/bibs?sort=updated&direction=desc').data)
    assert len(data['results']) == 10
    assert data['results'][0] == f'{API}/bibs/10'
    
    data = json.loads(client.get(f'{API}/bibs?sort=updated&direction=asc').data)
    assert data['results'][0] == f'{API}/bibs/1'
    
    response = client.get(f'{API}/bibs?format=xml')
    assert response.headers["Content-Type"] == 'text/xml; charset=utf-8'

    response = client.get(f'{API}/bibs?format=mrk')
    assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'
    
    response = client.get(f'{API}/bibs?format=mrc')
    assert response.headers["Content-Type"] == 'application/marc'
    
    response = client.get(f'{API}/bibs?format=txt')
    assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'
    
    response = client.get(f'{API}/bibs?format=brief')
    results = json.loads(response.data)['results']
    for field in ('_id', 'symbol', 'title', 'date', 'types'):
        assert field in results[0]
    
    response = client.get(f'{API}/auths?format=brief')
    results = json.loads(response.data)['results']
    for field in ('_id', 'heading', 'alt'):
        assert field in results[0]
    
def test_search(client, records):
    res = client.get(f'{API}/bibs?search=' + '900__a:10')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert len(data['results']) == 1
    
    res = client.get(f'{API}/auths?search=' + '400__a:1x')
    data = json.loads(res.data)
    assert len(data['results']) == 10

def test_record(client, records):
    data = json.loads(client.get(f'{API}/bibs/1').data)
    assert data['result']['_id'] == 1
    
    data = json.loads(client.get(f'{API}/auths/1').data)
    assert data['result']['_id'] == 1
    
def test_record_formats(client, records):
    for col in ('bibs', 'auths'):
        response = client.get('{}/{}/1?format=xml'.format(API, col))  
        assert response.headers["Content-Type"] == 'text/xml; charset=utf-8'
        
        response = client.get('{}/{}/1?format=mrk'.format(API, col))
        assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'
        
        response = client.get('{}/{}/1?format=mrc'.format(API, col))
        assert response.headers["Content-Type"] == 'application/marc'
        
        response = client.get('{}/{}/1?format=txt'.format(API, col))
        assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'

def test_records_fields_list(client, records):
    data = json.loads(client.get(f'{API}/bibs/1/fields').data)
    # this may change if future dlx version sets a 001 field automatically with the id
    assert len(data['results']) == 5
    assert f'{API}/bibs/1/fields/245/0' in data['results']
    assert f'{API}/bibs/1/fields/500/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1' in data['results']
    assert f'{API}/bibs/1/fields/900/0' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields').data)
    # this may change if future dlx version sets a 001 field automatically with the id
    assert len(data['results']) == 4
    assert f'{API}/auths/1/fields/100/0' in data['results']
    assert f'{API}/auths/1/fields/400/0' in data['results']
    assert f'{API}/auths/1/fields/400/1' in data['results']
    assert f'{API}/auths/1/fields/900/0' in data['results']
    
def test_record_field_place_list(client, records):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500').data)
    assert len(data['results']) == 2
    assert f'{API}/bibs/1/fields/500/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400').data)
    assert len(data['results']) == 2
    assert f'{API}/auths/1/fields/400/0' in data['results']
    assert f'{API}/auths/1/fields/400/1' in data['results']
    
def test_record_field_place_subfield_list(client, records):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/0/subfields').data)
    assert len(data['results']) == 1
    assert f'{API}/bibs/1/fields/500/0/subfields/a/0' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400/0/subfields').data)
    assert len(data['results']) == 1
    assert f'{API}/auths/1/fields/400/0/subfields/a/0' in data['results']
    
def test_record_field_place_subfield_place_list(client, records):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/0/subfields/a').data)
    assert len(data['results']) == 1
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/1/subfields/a').data)
    assert len(data['results']) == 2
    assert f'{API}/bibs/1/fields/500/1/subfields/a/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1/subfields/a/1' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400/0/subfields/a').data)
    assert len(data['results']) == 1
    data = json.loads(client.get(f'{API}/auths/1/fields/400/1/subfields/a').data)
    assert len(data['results']) == 2
    assert f'{API}/auths/1/fields/400/1/subfields/a/0' in data['results']
    assert f'{API}/auths/1/fields/400/1/subfields/a/1' in data['results']
    
def test_record_field_place_subfield_place(client, records):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/1/subfields/a/1').data)
    assert data['result'] == '3x'
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400/1/subfields/a/1').data)
    assert data['result'] == '3x'
    
def test_record_field_subfields_list(client, records):
    data = json.loads(client.get(f'{API}/bibs/1/subfields').data)
    assert len(data['results']) == 7
    assert f'{API}/bibs/1/fields/245/0/subfields/a/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1/subfields/a/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1/subfields/a/1' in data['results']
    assert f'{API}/bibs/1/fields/500/1/subfields/a/1' in data['results']
    assert f'{API}/bibs/1/fields/900/0/subfields/a/0' in data['results']
    assert f'{API}/bibs/1/fields/900/0/subfields/b/0' in data['results']
    
def test_create_record(client, records):
    data = '{"_id": 1, "invalid": 1}'
    response = client.post(f'{API}/bibs', headers={}, data=json.dumps(data))
    assert response.status_code == 400
    
    data = {"245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "A new record"}]}]}
    response = client.post(f'{API}/bibs', headers={}, data=json.dumps(data))
    assert response.status_code == 201
    assert client.get(f'{API}/bibs/11').status_code == 200
    
    data = '{"000": ["leader"], "710": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Name"}]}]}'
    response = client.post(f'{API}/bibs', headers={}, data=data)
    assert response.status_code == 201
    
    response = client.get(f'{API}/bibs/12?format=mrk')
    assert response.status_code == 200
    assert response.data.decode() == '=000  leader\n=710  \\\\$aName\n'

def test_create_record_mrk(client, records):
    data = 'invalid'
    response = client.post(f'{API}/bibs', headers={}, data=data)
    assert response.status_code == 400
    
    data = '=000  leader\n=245  \\\\$aYet another title$bsubtitle\n=269  \\\\$a2020'
    response = client.post(f'{API}/bibs?format=mrk', headers={}, data=data)
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/13')
    assert json.loads(response.data)['result'] == {
            "_id": 13,
            "000": ['leader'],
            "245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Yet another title"}, {'code': 'b', 'value': 'subtitle'}]}],
            "269": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "2020"}]}]
        }
    
def test_delete_record(client, records):
    assert client.delete(f'{API}/bibs/1').status_code == 200
    assert client.get(f'{API}/bibs/1').status_code == 404
    
def test_update_record(client, records):
    data = '{"_id": 1, "invalid": 1}'
    response = client.put(f'{API}/bibs/2', headers={}, data=json.dumps(data))
    assert response.status_code == 400

    data = '{"_id": 2, "245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "An updated title"}]}]}'    
    response = client.put(f'{API}/bibs/2', headers={}, data=data)
    assert response.status_code == 201
    
    data = json.loads(client.get(f'{API}/bibs/2/fields/245/0/subfields/a/0').data)
    assert data['result'] == "An updated title"
    assert client.get(f'{API}/bibs/1/fields/500/0/subfields/a/0').status_code == 404
    
def test_update_record_mrk(client, records):
    data = 'invalid'
    response = client.put(f'{API}/bibs/2?format=mrk', headers={}, data=data)
    assert response.status_code == 400
    
    data = '=000  leader\n=245  \\\\$aUpdated by MRK$bsubtitle\n=269  \\\\$a2020'
    response = client.put(f'{API}/bibs/7?format=mrk', headers={}, data=data)
    assert response.status_code == 201
    
    response = client.get(f'{API}/bibs/7')
    assert json.loads(response.data)['result'] == {
        "_id": 7,
        "000": ['leader'],
        "245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Updated by MRK"}, {'code': 'b', 'value': 'subtitle'}]}],
        "269": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "2020"}]}]
    }

def test_create_field(client, records):
    data = '{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Name"}]}'
    response = client.post(f'{API}/bibs/3/fields/610', headers={}, data=data)
    assert response.status_code == 201
    
    response = client.get(f'{API}/bibs/3/fields/610/0/subfields/a/0')
    assert response.status_code == 200
    assert json.loads(response.data)['result'] == 'Name'
    
    #controlfield
    response = client.post(f'{API}/bibs/4/fields/007', headers={}, data='controlfield data')
    assert response.status_code == 201
    response = client.get(f'{API}/bibs/4')
    assert json.loads(response.data)['result']['007'] == ['controlfield data']
  
def test_update_field(client, records):
    data = '{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Put on field"}]}'
    response = client.put(f'{API}/bibs/8/fields/245/0', headers={}, data=data)
    assert response.status_code == 201
    
    response = client.get(f'{API}/bibs/8/fields/245/0/subfields/a/0')
    assert response.status_code == 200 
    assert json.loads(response.data)['result'] == 'Put on field'
    
    data = '{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "New name"}]}'
    response = client.put(f'{API}/auths/11/fields/110/0', headers={}, data=data)
    assert response.status_code == 201
    response = client.put(f'{API}/bibs/9/fields/610/0', headers={}, data=data)
    assert response.status_code == 201
    
    #controlfield
    response = client.post(f'{API}/bibs/4/fields/006', headers={}, data='controlfield data')
    response = client.put(f'{API}/bibs/4/fields/006/0', headers={}, data='updated controlfield data')
    response = client.get(f'{API}/bibs/4')
    assert json.loads(response.data)['result']['006'] == ['updated controlfield data']

def test_delete_field(client, records):
    response = client.delete(f'{API}/bibs/8/fields/245/0')
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/8/fields/245/0')
    assert response.status_code == 404
    
def test_files(client, records):
    response = client.get(f'{API}/bibs/8')
    assert isinstance(json.loads(response.data)['files'], list)

def test_list_templates(client, templates):
    # Auths
    response = client.get(f'{API}/auths/templates')
    assert response.status_code == 200
    assert json.loads(response.data)['results'][0] == f'{API}/auths/templates/auth_template_1'
    
    # Bibs
    response = client.get(f'{API}/bibs/templates')
    assert response.status_code == 200
    assert json.loads(response.data)['results'][0] == f'{API}/bibs/templates/bib_template_1'

def test_template_CRUD(client, templates):   
    # get
    response = client.get(f'{API}/auths/templates/auth_template_1')
    assert response.status_code == 200
    assert json.loads(response.data)['result']['100'][0]['subfields'][0]['value'] == 'Name'

    # post
    data = {"100": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "New value"}]}]}
    data['name'] = 'auth_template_2'
    response = client.post(f'{API}/auths/templates', headers={}, data=json.dumps(data))
    assert response.status_code == 201
    assert json.loads(response.data)['result'] == f'{API}/auths/templates/auth_template_2'
    
    response = client.get(f'{API}/auths/templates/auth_template_2')
    assert response.status_code == 200
    assert json.loads(response.data)['result']['100'][0]['subfields'][0]['value'] == 'New value'
    
    # put
    new_data = {"100": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Updated value"}]}]}
    response = client.put(f'{API}/auths/templates/auth_template_1', headers={}, data=json.dumps(new_data))
    assert response.status_code == 201
    assert json.loads(response.data)['result'] == f'{API}/auths/templates/auth_template_1'
    
    response = client.get(f'{API}/auths/templates/auth_template_1')
    assert response.status_code == 200
    assert json.loads(response.data)['result']['100'][0]['subfields'][0]['value'] == 'Updated value'
    
    # delete 
    response = client.delete(f'{API}/auths/templates/auth_template_1')
    assert response.status_code == 200
    
    response = client.get(f'{API}/auths/templates/auth_template_1')
    assert response.status_code == 404

def test_auth_lookup(client, recordset_2):  
    response = client.get(f'{API}/bibs/lookup/610?a=giant&b=sub')
    assert response.status_code == 200
    assert json.loads(response.data)[0]['subfields'][0]['value'] == 'Giant organization'
    assert json.loads(response.data)[0]['subfields'][0]['xref']
    
    response = client.get(f'{API}/bibs/lookup/610?a=small&b=sub')
    assert response.status_code == 200
    assert json.loads(response.data)[0]['subfields'][0]['value'] == 'Small organization'
    assert json.loads(response.data)[0]['subfields'][0]['xref']
