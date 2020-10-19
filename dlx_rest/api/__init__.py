from datetime import datetime
from urllib.parse import unquote
from flask import Flask, Response, g, url_for, jsonify, request, abort as flask_abort
from flask_restx import Resource, Api, reqparse
from flask_login import login_required, current_user
from pymongo import ASCENDING as ASC, DESCENDING as DESC
from flask_cors import CORS
from base64 import b64decode
from dlx import DB
from dlx.marc import MarcSet, BibSet, Bib, AuthSet, Auth, Controlfield, Datafield, Query, InvalidAuthValue, InvalidAuthXref
from dlx_rest.config import Config
from dlx_rest.app import app, login_manager
from dlx_rest.models import User
import json
from json import JSONDecodeError

#authorizations  
authorizations = {
    'basic': {
        'type': 'basic'
    }
}

DB.connect(Config.connect_string)

api = Api(app, doc='/api/', authorizations=authorizations)
ns = api.namespace('api', description='DLX MARC REST API')

# Set some api-wide arguments

list_argparser = reqparse.RequestParser()
list_argparser.add_argument('start', type=int, help='Number of record results to skip for pagination. Default is 0.')
list_argparser.add_argument('limit', type=int, help='Number of results to return. Default is 100 for record lists and 0 (unlimited) for field and subfield lists.')
list_argparser.add_argument('sort', type=str, help='Valid strings are "date"')
list_argparser.add_argument('direction', type=str, help='Valid strings are "asc", "desc". Default is "desc"')
list_argparser.add_argument('format', type=str, help='Formats the list as a batch of records instead of URLs. Valid formats are "json", "xml", "mrc", "mrk"')
list_argparser.add_argument('search', type=str, help='Consult documentation for query syntax')

resource_argparser = reqparse.RequestParser()
resource_argparser.add_argument('format', type=str, help='Valid formats are "json", "xml", "mrc", "mrk", "txt"')

post_put_argparser = reqparse.RequestParser()
post_put_argparser.add_argument('format', help="The format of the data being sent through the HTTP request")
    
# Set up the login manager for the API
@login_manager.request_loader
def request_loader(request):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None

    if 'Bearer ' in auth_header:
        # Try a token first
        token = auth_header.replace('Bearer ','',1)
        user = User.verify_auth_token(token)
        if user:
            return user
        return None
    elif 'Basic ' in auth_header:
        # Now try username and password in basic http auth
        email,password = b64decode(auth_header.replace('Basic ','',1)).decode('utf-8').split(':')
        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                return None
        except:
            return None
        g.user = user
        return user


# Custom error messages
def abort(code, message=None):
    msgs = {
        404: 'Requested resource not found'
    }

    flask_abort(code, message or msgs.get(code, None))

### Utility classes

class ClassDispatch():
    index = {
        Config.BIB_COLLECTION: Bib,
        Config.AUTH_COLLECTION: Auth
    }
    
    batch_index = {
        Config.BIB_COLLECTION: BibSet,
        Config.AUTH_COLLECTION: AuthSet
    }
    
    @classmethod
    def list_names(cls):
        return cls.index.keys()

    @classmethod
    def by_collection(cls, name):
        return cls.index.get(name)
        
    @classmethod
    def batch_by_collection(cls, name):
        return cls.batch_index.get(name)

class ListResponse():
    def __init__(self, endpoint, items, **kwargs):
        self.url = URL(endpoint, **kwargs).to_str()
        self.start = kwargs.pop('start', 0)
        self.limit = kwargs.pop('limit', 0)
        self.items = items

    def json(self):
        data = {
            '_links': {'self': self.url},
            'start': self.start,
            'limit': self.limit,
            'results': self.items
        }

        return jsonify(data)

class BatchResponse():
    def __init__(self, records):
        assert isinstance(records, MarcSet)
        self.records = records
        
    def json(self):
        return jsonify([r.to_dict() for r in self.records])
    
    def xml(self):
        return Response(self.records.to_xml(), mimetype='text/xml')

    def mrc(self):
        return Response(self.records.to_mrc(), mimetype='application/marc')
        
    def mrk(self):
        return Response(self.records.to_mrk(), mimetype='text/plain')
    
    def txt(self):
        return Response(self.records.to_str(), mimetype='text/plain')
        
class FieldResponse():
    def __init__(self, field):
        assert isinstance(field, Field)
        self.field = field
        
    def json(self):
        data = {
            '_links': {'self': self.url},
            'result': self.field.to_dict()
        }
        
        return jsonify(data)
        
    def json_raw(self):
        return jsonify(self.field.to_dict())

class RecordResponse():
    def __init__(self, endpoint, record, **kwargs):
        self.record = record
        self.url = URL(endpoint, **kwargs).to_str()

    def json(self):
        data = {
            '_links': {'self': self.url},
            'result': self.record.to_dict()
        }

        return jsonify(data)
        
    def json_raw(self):
        return jsonify(self.record.to_dict())

    def xml(self):
        return Response(self.record.to_xml(), mimetype='text/xml')

    def mrc(self):
        return Response(self.record.to_mrc(), mimetype='application/marc')

    def mrk(self):
        return Response(self.record.to_mrk(), mimetype='text/plain')

    def txt(self):
        return Response(self.record.to_str(), mimetype='text/plain')
        
class ValueResponse():
    def __init__(self, endpoint, value, **kwargs):
        self.value = value
        self.url = URL(endpoint, **kwargs).to_str()

    def json(self):
        data = {
            '_links': {'self': self.url},
            'result': self.value
        }

        return jsonify(data)

class URL():
    def __init__(self, endpoint, **kwargs):
        self.endpoint = endpoint
        self.kwargs = kwargs

    def to_str(self, **kwargs):
        self.kwargs.setdefault('_external', True)
        return url_for(self.endpoint, **self.kwargs)

### Routes

# Authentication
@ns.route('/token')
class AuthToken(Resource):
    #@auth.login_required
    @login_required
    def get(self):
        token = g.user.generate_auth_token()
        return jsonify({ 'token': token.decode('ascii') })

# Main API routes
@ns.route('/collections')
class CollectionsList(Resource):
    @ns.doc(description='Return a list of the collection endpoints.')
    def get(self):
        collections = ClassDispatch.list_names()

        results = [
            URL('api_records_list', collection=col).to_str() for col in collections
        ]

        response = ListResponse(
            'api_collections_list',
            results
        )

        return response.json()

# Lists of records

@ns.route('/<string:collection>')
@ns.param('collection', '"bibs" or "auths"')
class RecordsList(Resource):
    @ns.doc(description='Return a list of MARC Bibliographic or Authority Records')
    @ns.expect(list_argparser)
    def get(self, collection):
        try:
            cls = ClassDispatch.batch_by_collection(collection)
        except KeyError:
            abort(404)

        args = list_argparser.parse_args()
        search = args['search']
        start = args['start'] or 0
        limit = args['limit'] or 100
        sort_by = args['sort']
        direction = args['direction'] or ''
        fmt = args['format'] or ''
        
        if search:
            search = unquote(search)                
            
            try:
                json.loads(search)
            except:
                abort(400, 'Search string is invalid JSON')
                
            query = Query.from_string(search)
        else:
            query = {}

        if sort_by == 'date':
            sort = [('updated', ASC)] if direction.lower() == 'asc' else [('updated', DESC)]
        else:
            sort = None
        
        project = None if fmt else {'_id': 1}
        
        rset = cls.from_query(query, projection=project, skip=start, limit=limit, sort=sort)
        
        if fmt:
            return getattr(BatchResponse(rset), fmt)()

        records_list = [
            URL('api_record', collection=collection, record_id=r.id).to_str() for r in rset
        ]

        response = ListResponse(
            'api_records_list',
            records_list,
            collection=collection,
            start=start,
            limit=limit,
            sort=sort_by
        )

        return response.json()
    
    @ns.doc(description='Create a Bibliographic or Authority Record with the given data.', security='basic')
    @ns.expect(post_put_argparser)
    @login_required
    def post(self, collection):
        user = 'testing' if current_user.is_anonymous else current_user.email
        args = post_put_argparser.parse_args()
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
    
        if args.format == 'mrk':
            try:
                result = cls.from_mrk(request.data.decode()).commit(user=user)
            except Exception as e:
                abort(400, str(e))
        else:
            try:
                jmarc = json.loads(request.data)
                
                if '_id' in jmarc:
                    abort(400, '"_id" field is invalid for a new record')
                    
                result = cls(jmarc).commit(user=user)
            except Exception as e:
                abort(400, str(e))
        
            if result.acknowledged:
                return Response(status=200)
            else:
                abort(500)

@ns.route('/<string:collection>/<int:record_id>/fields')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldsList(Resource):
    @ns.doc(description='Return a list of the Fields in the Record with the record')
    def get(self, collection, record_id):
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)

        fields_list = []
        
        for tag in sorted(set(record.get_tags())):
            fields_list.append(
                URL('api_record_field_place_list',
                    collection=collection,
                    record_id=record.id,
                    field_tag=tag
                ).to_str()
            )

        response = ListResponse(
            'api_record_fields_list',
            fields_list,
            collection=collection,
            record_id=record.id,
        )

        return response.json()
        
@ns.route('/<string:collection>/<int:record_id>/subfields')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordSubfieldsList(Resource):
    @ns.doc(description='Return a list of all the subfields in the record with the given record')
    def get(self, collection, record_id):
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        subfields_list = []
        
        for tag in record.get_tags():
            field_place = 0
            
            for field in record.get_fields(tag):        
                if type(field) == Controlfield:
                    # todo: do something with Datafields
                    continue
                    
                subfield_place = 0
                seen = {}
                
                for subfield in field.subfields:
                    if subfield.code in seen:
                        subfield_place = seen[subfield.code]
                        seen[subfield.code] += 1
                    else:
                        subfield_place = 0
                        seen[subfield.code] = 1
                    
                    subfields_list.append(
                        URL(
                            'api_record_field_place_subfield_place',
                            collection=collection,
                            record_id=record.id,
                            field_tag=field.tag,
                            field_place=field_place,
                            subfield_code=subfield.code,
                            subfield_place=subfield_place
                        ).to_str()
                    )    
   
                field_place += 1

        response = ListResponse(
            'api_record_subfields_list',
            subfields_list,
            collection=collection,
            record_id=record.id,
        )
        
        return response.json()
    
@ns.route('/<string:collection>/<int:record_id>/fields/<string:field_tag>')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldPlaceList(Resource):
    @ns.doc(description='Return a list of the instances of the field in the record')
    def get(self, collection, record_id, field_tag):
        route_params = locals()
        route_params.pop('self')

        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        places = len(list(record.get_fields(field_tag)))
        field_places = []
        
        for place in range(0, places):
            route_params['field_place'] = place

            field_places.append(
                URL('api_record_field_place_subfield_list', **route_params).to_str()
            )

        response = ListResponse(
            'api_record_field_place_list',
            field_places,
            **route_params
        )

        return response.json()
    
    @ns.doc(description='Create new field with the given tag', security='basic')
    @login_required
    def post(self, collection, record_id, field_tag):
        user = 'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        try:
            field = Datafield.from_json(
                record_type=cls.record_type, 
                tag=field_tag,
                data=request.data.decode()
            )
                
            record_data = record.to_dict()
            field_data = field.to_dict()
            
            if field_tag not in record_data:
                record_data[field_tag] = []
            
            record_data[field_tag].append(field_data)
                
            record = cls(record_data)
        except Exception as e:
            abort(400, str(e))
        
        result = record.commit(user=user)
        
        if result.acknowledged:
            return Response(status=200)
        else:
            abort(500)
    
@ns.route('/<string:collection>/<int:record_id>/fields/<string:field_tag>/<int:field_place>')
@ns.param('field_place', 'The incidence number of the field in the record, starting with 0')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldPlaceSubfieldList(Resource):
    @ns.doc(description='Return a list of the subfield codes in the field')
    def get(self, collection, record_id, field_tag, field_place):
        route_params = locals()
        route_params.pop('self')

        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        field = record.get_field(field_tag, place=field_place) or abort(404)
        
        subfield_places = []

        for sub in field.subfields:
            route_params['subfield_code'] = sub.code

            subfield_places.append(
                URL('api_record_field_place_subfield_place_list', **route_params).to_str()
            )

        response = ListResponse(
            'api_record_field_place_subfield_list',
            subfield_places,
            **route_params
        )

        return response.json()
        
    @ns.doc(description='Replace the field with the given tag at the given place', security='basic')
    @login_required
    def put(self, collection, record_id, field_tag, field_place):
        user = f'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        record.get_field(field_tag, place=field_place) or abort(404)
        
        try:
            field = Datafield.from_json(
                record_type=cls.record_type, 
                tag=field_tag,
                data=request.data.decode()
            )
                
            record_data = record.to_dict()
            field_data = field.to_bson().to_dict()
            record_data[field_tag][field_place] = field_data
                
            result = cls(record_data).commit()
        except Exception as e:
            abort(400, str(e))

        if result.acknowledged:
            return Response(status=200)
        else:
            abort(500)
    
    @ns.doc(description='Delete the field with the given tag at the given place', security='basic')
    @login_required
    def delete(self, collection, record_id, field_tag, field_place):
        user = f'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        record.get_field(field_tag, place=field_place) or abort(404)
        
        record.delete_field(field_tag, place=field_place)
        
        if record.commit(user=user):
            return Response(status=200)
        else:
            abort(500)
        
@ns.route('/<string:collection>/<int:record_id>/fields/<string:field_tag>/<int:field_place>/<string:subfield_code>')
@ns.param('subfield_code', 'The subfield code')
@ns.param('field_place', 'The incidence number of the field in the record, starting with 0')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldPlaceSubfieldPlaceList(Resource):
    @ns.doc(description='Return a list of the subfields with the given code')
    def get(self, collection, record_id, field_tag, field_place, subfield_code):
        route_params = locals()
        route_params.pop('self')

        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        field = record.get_field(field_tag, place=field_place) or abort(404)
        subfields = filter(lambda x: x.code == subfield_code, field.subfields) or abort(404) # dlx needs a 'get_subfields' method

        subfield_places = []
        for place in range(0, len(list(subfields))):
            route_params['subfield_place'] = place

            subfield_places.append(
                URL('api_record_field_place_subfield_place', **route_params).to_str()
            )

        response = ListResponse(
            'api_record_field_place_subfield_place_list',
            subfield_places,
            **route_params
        )

        return response.json()

# Single records

@ns.route('/<string:collection>/<int:record_id>/fields/<string:field_tag>/<int:field_place>/<string:subfield_code>/<int:subfield_place>')
@ns.param('subfield_place', 'The incidence number of the subfield code in the field, starting wtih 0')
@ns.param('subfield_code', 'The subfield code')
@ns.param('field_place', 'The incidence number of the field in the record, starting with 0')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldPlaceSubfieldPlace(Resource):
    @ns.doc(description='Return the value of the subfield')
    def get(self, collection, record_id, field_tag, field_place, subfield_code, subfield_place):
        route_params = locals()
        route_params.pop('self')

        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        field = record.get_field(field_tag, place=field_place) or abort(404)
        subfields = filter(lambda x: x.code == subfield_code, field.subfields) or abort(404)

        try:
            value = [sub.value for sub in subfields][subfield_place]
        except KeyError:
            abort(404)

        response = ValueResponse(
            'api_record_field_place_subfield_place',
            value,
            **route_params
        )

        return response.json()

@ns.route('/<string:collection>/<int:record_id>')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class Record(Resource):
    @ns.doc(description='Return the record with the given identifier')
    @ns.expect(resource_argparser)
    def get(self, collection, record_id):
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)

        response = RecordResponse(
            'api_record',
            record,
            collection=collection,
            record_id=record_id,
        )

        args = resource_argparser.parse_args()
        fmt = args.get('format', None)
        
        if fmt:
            try:
                return getattr(response, fmt)()
            except AttributeError:
                abort(422)
            except:
                abort(500)
        else:
            return response.json()

    @ns.doc(description='Replace the record with the given data.', security='basic')
    @ns.expect(post_put_argparser)
    @login_required
    def put(self, collection, record_id):
        user = 'testing' if current_user.is_anonymous else current_user.email
        args = post_put_argparser.parse_args()
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)

        if args.format == 'mrk':
            try:
                record = cls.from_mrk(request.data.decode())
                record.id = record_id
                result = record.commit(user=user)
            except Exception as e:
                abort(400, str(e))
        else:
            try:
                jmarc = json.loads(request.data)
                result = cls(jmarc).commit(user=user)
            except Exception as e:
                abort(400, str(e))
        
        if result.acknowledged:
            return Response(status=200)
        else:
            abort(500)
    
    @ns.doc(description='Not functional', security='basic')
    @login_required
    def patch(self, collection, record_id):
        user = 'testing' if current_user.is_anonymous else current_user.email
        
        abort(501)
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        # todo

    @ns.doc(description='Delete the Bibliographic or Authority Record with the given identifier', security='basic')
    @login_required
    def delete(self, collection, record_id):
        user = 'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)

        result = record.delete(user=user)
        
        if result.acknowledged:
            return Response(status=200)
        else:
            abort(500)
        
        
