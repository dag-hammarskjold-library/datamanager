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

def test_collections_list(client):
    data = json.loads(client.get(f'{API}/collections').data)
    assert len(data['results']) == 2
    assert f'{API}/bibs' in data['results']
    assert f'{API}/auths' in data['results']
    
def test_records_list(client, records):
    data = json.loads(client.get(f'{API}/bibs').data)
    assert len(data['results']) == 50
    
    data = json.loads(client.get(f'{API}/auths').data)
    assert len(data['results']) == 51
    
    data = json.loads(client.get(f'{API}/bibs?sort=date&direction=desc').data)
    assert len(data['results']) == 50
    assert data['results'][0] == f'{API}/bibs/50'
    
    data = json.loads(client.get(f'{API}/bibs?sort=date&direction=asc').data)
    assert data['results'][0] == f'{API}/bibs/1'
    
    response = client.get(f'{API}/bibs?format=xml')
    assert response.headers["Content-Type"] == 'text/xml; charset=utf-8'

    response = client.get(f'{API}/bibs?format=mrk')
    assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'
    
    response = client.get(f'{API}/bibs?format=mrc')
    assert response.headers["Content-Type"] == 'application/marc'

def test_search(client):
    res = client.get(f'{API}/bibs?search=' + '{"900": {"a": "25"}}')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert len(data['results']) == 1
    
    res = client.get(f'{API}/bibs?search=' + r'{"900": {"a": "/^3\\d/"}}')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert len(data['results']) == 10
    
    res = client.get(f'{API}/auths?search=' + '{"OR": {"400": 0, "999": 1}}')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert len(data['results']) == 1

def test_record(client):
    data = json.loads(client.get(f'{API}/bibs/1').data)
    assert data['result']['_id'] == 1
    
    data = json.loads(client.get(f'{API}/auths/1').data)
    assert data['result']['_id'] == 1
    
def test_record_formats(client):
    for col in ('bibs', 'auths'):
        response = client.get('{}/{}/1?format=xml'.format(API, col))  
        assert response.headers["Content-Type"] == 'text/xml; charset=utf-8'
        
        response = client.get('{}/{}/1?format=mrk'.format(API, col))
        assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'
        
        response = client.get('{}/{}/1?format=mrc'.format(API, col))
        assert response.headers["Content-Type"] == 'application/marc'
        
        response = client.get('{}/{}/1?format=txt'.format(API, col))
        assert response.headers["Content-Type"] == 'text/plain; charset=utf-8'

def test_records_fields_list(client):
    data = json.loads(client.get(f'{API}/bibs/1/fields').data)
    # this may change if future dlx version sets a 001 field automatically with the id
    assert len(data['results']) == 3
    assert f'{API}/bibs/1/fields/245' in data['results']
    assert f'{API}/bibs/1/fields/500' in data['results']
    assert f'{API}/bibs/1/fields/900' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields').data)
    # this may change if future dlx version sets a 001 field automatically with the id
    assert len(data['results']) == 3
    assert f'{API}/auths/1/fields/100' in data['results']
    assert f'{API}/auths/1/fields/400' in data['results']
    assert f'{API}/auths/1/fields/900' in data['results']
    
def test_record_field_place_list(client):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500').data)
    assert len(data['results']) == 2
    assert f'{API}/bibs/1/fields/500/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400').data)
    assert len(data['results']) == 2
    assert f'{API}/auths/1/fields/400/0' in data['results']
    assert f'{API}/auths/1/fields/400/1' in data['results']
    
def test_record_field_place_subfield_list(client):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/0').data)
    assert len(data['results']) == 1
    assert f'{API}/bibs/1/fields/500/0/a' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400/0').data)
    assert len(data['results']) == 1
    assert f'{API}/auths/1/fields/400/0/a' in data['results']
    
def test_record_field_place_subfield_place_list(client):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/0/a').data)
    assert len(data['results']) == 1
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/1/a').data)
    assert len(data['results']) == 2
    assert f'{API}/bibs/1/fields/500/1/a/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1/a/1' in data['results']
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400/0/a').data)
    assert len(data['results']) == 1
    data = json.loads(client.get(f'{API}/auths/1/fields/400/1/a').data)
    assert len(data['results']) == 2
    assert f'{API}/auths/1/fields/400/1/a/0' in data['results']
    assert f'{API}/auths/1/fields/400/1/a/1' in data['results']
    
def test_record_field_place_subfield_place(client):
    data = json.loads(client.get(f'{API}/bibs/1/fields/500/1/a/1').data)
    assert data['result'] == '3x'
    
    data = json.loads(client.get(f'{API}/auths/1/fields/400/1/a/1').data)
    assert data['result'] == '3x'
    
def test_record_field_subfields_list(client):
    data = json.loads(client.get(f'{API}/bibs/1/subfields').data)
    assert len(data['results']) == 9
    assert f'{API}/bibs/1/fields/245/0/a/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1/a/0' in data['results']
    assert f'{API}/bibs/1/fields/500/1/a/1' in data['results']
    
def test_create_record(client):
    data = '{"_id": 1, "invalid": 1}'
    response = client.post(f'{API}/bibs', headers={}, data=json.dumps(data))
    assert response.status_code == 400
    
    data = {"245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "A new record"}]}]}
    response = client.post(f'{API}/bibs', headers={}, data=json.dumps(data))
    assert response.status_code == 200
    assert client.get(f'{API}/bibs/51').status_code == 200
    
    data = '{"000": ["leader"], "710": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Name"}]}]}'
    response = client.post(f'{API}/bibs', headers={}, data=data)
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/52?format=mrk')
    assert response.status_code == 200
    assert response.data.decode() == '=000  leader\n=710  \\\\$aName\n'

def test_create_record_mrk(client):
    data = 'invalid'
    response = client.post(f'{API}/bibs', headers={}, data=data)
    assert response.status_code == 400
    
    data = '=000  leader\n=245  \\\\$aYet another title$bsubtitle\n=269  \\\\$a2020'
    response = client.post(f'{API}/bibs?format=mrk', headers={}, data=data)
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/53')
    assert json.loads(response.data)['result'] == \
        {
            "_id": 53,
            "000": ['leader'],
            "245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Yet another title"}, {'code': 'b', 'value': 'subtitle'}]}],
            "269": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "2020"}]}]
        }
    
def test_delete_record(client):
    assert client.delete(f'{API}/bibs/1').status_code == 200
    assert client.get(f'{API}/bibs/1').status_code == 404
    
def test_update_record(client):
    data = '{"_id": 1, "invalid": 1}'
    response = client.put(f'{API}/bibs/2', headers={}, data=json.dumps(data))
    assert response.status_code == 400

    data = '{"_id": 2, "245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "An updated title"}]}]}'    
    response = client.put(f'{API}/bibs/2', headers={}, data=data)
    assert response.status_code == 200
    
    data = json.loads(client.get(f'{API}/bibs/2/fields/245/0/a/0').data)
    assert data['result'] == "An updated title"
    assert client.get(f'{API}/bibs/1/fields/500/0/a/0').status_code == 404
    
def test_update_record_mrk(client):
    data = 'invalid'
    response = client.put(f'{API}/bibs/2?format=mrk', headers={}, data=data)
    assert response.status_code == 400
    
    data = '=000  leader\n=245  \\\\$aUpdated by MRK$bsubtitle\n=269  \\\\$a2020'
    response = client.put(f'{API}/bibs/25?format=mrk', headers={}, data=data)
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/25')
    assert json.loads(response.data)['result'] == \
        {
            "_id": 25,
            "000": ['leader'],
            "245": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Updated by MRK"}, {'code': 'b', 'value': 'subtitle'}]}],
            "269": [{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "2020"}]}]
        }

def test_create_field(client):
    data = '{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Name"}]}'
    response = client.post(f'{API}/bibs/31/fields/610', headers={}, data=data)
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/31/fields/610/0/a/0')
    assert response.status_code == 200
    assert json.loads(response.data)['result'] == 'Name'
  
def test_update_field(client):
    data = '{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Put on field"}]}'
    response = client.put(f'{API}/bibs/31/fields/245/0', headers={}, data=data)
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/31/fields/245/0/a/0')
    assert response.status_code == 200 
    assert json.loads(response.data)['result'] == 'Put on field'
    
    data = '{"indicators": [" ", " "], "subfields": [{"code": "a", "value": "Name"}]}'
    response = client.put(f'{API}/bibs/31/fields/610/0', headers={}, data=data)
    assert response.status_code == 200
    
def test_delete_field(client):
    response = client.delete(f'{API}/bibs/31/fields/245/0')
    assert response.status_code == 200
    
    response = client.get(f'{API}/bibs/31/fields/245/0')
    assert response.status_code == 404
