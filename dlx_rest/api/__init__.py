from datetime import datetime
from json import loads as load_json, JSONDecodeError
from copy import copy
from uuid import uuid1
from urllib.parse import unquote
from flask import Flask, Response, g, url_for, jsonify, request, abort as flask_abort
from flask_restx import Resource, Api, reqparse
from flask_login import login_required, current_user
from flask_cors import CORS
from base64 import b64decode
from dlx import DB, Config as Dconfig
from dlx.marc import MarcSet, BibSet, Bib, AuthSet, Auth, Field, Controlfield, Datafield, \
    Query, Condition, InvalidAuthValue, InvalidAuthXref, AuthInUse
from dlx.file import File, Identifier
from dlx_rest.config import Config
from dlx_rest.app import app, login_manager
from dlx_rest.models import User
from pymongo import ASCENDING as ASC, DESCENDING as DESC
from bson import Regex

# Init
authorizations = {
    'basic': {
        'type': 'basic'
    }
}
api = Api(app, doc='/api/', authorizations=authorizations)
ns = api.namespace('api', description='DLX MARC REST API')
DB.connect(Config.connect_string)
    
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
        email,password = b64decode(auth_header.replace('Basic ', '', 1)).decode('utf-8').split(':')
    
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
        400: 'Bad request',
        404: 'Requested resource not found'
    }

    flask_abort(code, message or msgs.get(code, None))

### Utilities

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

class URL():
    def __init__(self, endpoint, **kwargs):
        self.endpoint = endpoint
        self.kwargs = kwargs

    def to_str(self, **kwargs):
        self.kwargs.setdefault('_external', True)
        return url_for(self.endpoint, **self.kwargs)

def brief_bib(record):
    ctypes = ['::'.join(field.get_values('a', 'b', 'c')) for field in record.get_fields('989')]
    
    if record.get_value('245', 'a'):
        head = ' '.join(record.get_values('245', 'a', 'b', 'c'))
    else:
        head, member = record.get_value('700', 'a'), record.get_value('710', 'a')

        if member:
            head += f' ({member})'

    return {
        '_id': record.id,
        'url': URL('api_record', collection='bibs', record_id=record.id).to_str(),
        'symbol': '; '.join(record.get_values('191', 'a') or record.get_values('791', 'a')),
        'title': head or '[No Title]',
        'date': record.get_value('269', 'a'),
        'types': '; '.join(ctypes)
    }
    
def brief_auth(record):
    digits = record.heading_field.tag[1:3]
    alt_tag = '4' + digits
    
    return {
        '_id': record.id,
        'url': URL('api_record', collection='auths', record_id=record.id).to_str(),
        'heading': record.heading_value('a'),
        'alt': '; '.join(record.get_values(alt_tag, 'a'))
    }

    def json_raw(self):
        return jsonify(self.field.to_dict())

### Request parsers

list_argparser = reqparse.RequestParser()
list_argparser.add_argument('start', type=int, help='Number of record results to skip for pagination. Default is 0.')
list_argparser.add_argument('limit', type=int, help='Number of results to return. Default is 100 for record lists and 0 (unlimited) for field and subfield lists.')
list_argparser.add_argument('sort', type=str, help='Valid strings are "updated"')
list_argparser.add_argument('direction', type=str, help='Valid strings are "asc", "desc". Default is "desc"')
list_argparser.add_argument('format', type=str, help='Formats the list as a batch of records instead of URLs. Valid formats are "json", "xml", "mrc", "mrk", "brief"')
list_argparser.add_argument('search', type=str, help='Consult documentation for query syntax')

resource_argparser = reqparse.RequestParser()
resource_argparser.add_argument('format', type=str, help='Valid formats are "json", "xml", "mrc", "mrk", "txt"')

post_put_argparser = reqparse.RequestParser()
post_put_argparser.add_argument('format', help="The format of the data being sent through the HTTP request")

### Routes

# Authentication
@ns.route('/token')
class AuthToken(Resource):
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

        payload = [
            URL('api_collection', collection=col).to_str() for col in collections
        ]

        return jsonify(
            {
                '_links': {
                    'self': URL('api_collections_list').to_str(),
                    'endpoints': None,
                    'prev': None,
                    'next': None
                },
                '_meta': {
                    'name': 'api_collections_list'
                },
                'payload': payload
            }
        )
        
@ns.route('/collections/<string:collection>')
class Collection(Resource):
    @ns.doc(description='')
    def get(self, collection):
        return jsonify(
            {
                '_links': {
                    'self': URL('api_collection', collection=collection).to_str(),
                    'prev': URL('api_collections_list').to_str(),
                    'endpoints': {
                        'records': URL('api_records_list', collection=collection).to_str(),
                        'templates': URL('api_templates_list', collection=collection).to_str(),
                        'lookup': 'todo'
                    },
                },
                '_meta': {
                    'name': 'api_collection'
                },
                'payload': None
            }
        )

@ns.route('/collections/<string:collection>/records')
@ns.param('collection', '"bibs" or "auths"')
class RecordsList(Resource):
    @ns.doc(description='Return a list of MARC Bibliographic or Authority Records')
    @ns.expect(list_argparser)
    def get(self, collection):
        route_params = locals()
        route_params.pop('self')
        
        cls = ClassDispatch.batch_by_collection(collection) or abort(404)
        args = list_argparser.parse_args()
        search = args['search']
        start = args['start'] or 0
        limit = args['limit'] or 100
        sort_by = args['sort']
        direction = args['direction'] or ''
        fmt = args['format'] or ''
        
        # search
        if search:
            search = unquote(search)
                
        query = Query.from_string(search) if search else {}
        
        # start
        if start:
            start -= 1
            
        if int(limit) > 1000:
            abort(404, 'Maximum limit is 1000')
            
        # sort
        if sort_by == 'updated':
            sort = [('updated', ASC)] if direction.lower() == 'asc' else [('updated', DESC)]
        else:
            sort = None
        
        # format
        if fmt == 'brief':
            if collection == 'bibs':
                project = dict.fromkeys(('191', '245', '269', '700', '710', '791', '989'), True)
            elif collection == 'auths':
                project = dict.fromkeys(
                    ('100', '110', '111', '130', '150', '151', '190', '191', '400', '410', '411', '430', '450', '451', '490', '491'),
                    True
                )
        elif fmt:
            project = None
        else:
            project = {'_id': 1}

        ###
        
        recordset = cls.from_query(query, projection=project, skip=start, limit=limit, sort=sort)
        
        ###
        
        if fmt == 'xml':
            return Response(self.recordset.to_xml(), mimetype='text/xml')
        elif fmt == 'mrk':
            return Response(recordset.to_mrk(), mimetype='text/plain')
        elif fmt == 'brief':
            make_brief = brief_bib if recordset.record_class == Bib else brief_auth
            payload = [make_brief(r) for r in recordset]
        else:    
            payload = [URL('api_record', record_id=r.id, **route_params).to_str() for r in recordset]

        return jsonify(
            {
                '_links': {
                    'self': URL('api_records_list', start=start+1, limit=limit, **route_params).to_str(),
                    'next': URL('api_records_list', collection=collection, start=start+1+limit, limit=limit).to_str(),
                    'prev': URL('api_records_list', collection=collection, start=start-limit if start-limit>0 else 1, limit=limit).to_str() \
                        if start > 1 else URL('api_collection', **route_params).to_str() 
                },
                'payload': payload
            }
        )
    
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
                jmarc = load_json(request.data)
                
                if '_id' in jmarc:
                    abort(400, '"_id" field is invalid for a new record')
                    
                record = cls(jmarc, auth_control=True)
                result = record.commit(user=user)
            except Exception as e:
                abort(400, str(e))
        
            if result.acknowledged:
                data = {'result': URL('api_record', collection=collection, record_id=record.id).to_str()}
                
                return data, 201
            else:
                abort(500)

@ns.route('/collections/<string:collection>/records/<int:record_id>/fields')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldsList(Resource):
    @ns.doc(description='Return a list of the Fields in the Record with the record')
    def get(self, collection, record_id):
        route_params = locals()
        route_params.pop('self')
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)

        fields_list = []
        
        for tag in record.get_tags():
            for place, field in enumerate(record.get_fields(tag)):
                
                fields_list.append(
                    URL('api_record_field_place',
                        collection=collection,
                        record_id=record.id,
                        field_tag=tag,
                        field_place=place
                    ).to_str()
                )

        return jsonify(
            {
                '_links': {
                    'self': URL('api_record_fields_list', **route_params).to_str(),
                    'prev': URL('api_record', **route_params).to_str()
                },
                'payload': fields_list
            }
        )
        
@ns.route('/collections/<string:collection>/records/<int:record_id>/subfields')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordSubfieldsList(Resource):
    @ns.doc(description='Return a list of all the subfields in the record with the given record')
    def get(self, collection, record_id):
        route_params = locals()
        route_params.pop('self')
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        subfields = []
        
        for tag in record.get_tags(): 
            for field_place, field in enumerate(record.get_fields(tag)):        
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
                    
                    subfields.append(
                        URL(
                            'api_record_field_subfield_value',
                            field_tag=field.tag,
                            field_place=field_place,
                            subfield_code=subfield.code,
                            subfield_place=subfield_place,
                            **route_params
                        ).to_str()
                    )
                    
        return jsonify(
            {
                '_links': {
                    'self': URL('api_record_subfields_list', **route_params).to_str(),
                    'prev': URL('api_record', **route_params).to_str()
                },
                'payload': subfields
            }
        )
    
@ns.route('/collections/<string:collection>/records/<int:record_id>/fields/<string:field_tag>')
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
            #route_params['field_place'] = place

            field_places.append(
                URL('api_record_field_place', field_place=place, **route_params).to_str()
            )
            
        return jsonify(
            {
                '_links': {
                    'self': URL('api_record_field_place_list', **route_params).to_str(),
                    'prev': URL('api_record_fields_list', collection=collection, record_id=record_id).to_str() 
                },
                'payload': field_places
                
            }
        )
    
    @ns.doc(description='Create new field with the given tag', security='basic')
    @login_required
    def post(self, collection, record_id, field_tag):
        user = 'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        
        try:
            if field_tag[:2] == '00':
                field_data = request.data.decode() #     scalar value
            else:
                field = Datafield.from_json(
                    record_type=cls.record_type, 
                    tag=field_tag,
                    data=request.data.decode(),
                    auth_control=True
                )
                field_data = field.to_dict()
            
            record_data = record.to_dict()
            
            if field_tag not in record_data:
                record_data[field_tag] = []
            
            record_data[field_tag].append(field_data)
                
            record = cls(record_data, auth_control=True)
        except Exception as e:
            abort(400, str(e))
        
        result = record.commit(user=user)
        
        if result.acknowledged:
            url = URL(
                'api_record_field_place',
                collection=collection,
                record_id=record.id,
                field_tag=field_tag,
                field_place=len(record.get_fields(field_tag)) - 1
            )

            return {'result': url.to_str()}, 201
        else:
            abort(500)
    
@ns.route('/collections/<string:collection>/records/<int:record_id>/fields/<string:field_tag>/<int:field_place>')
@ns.param('field_place', 'The incidence number of the field in the record, starting with 0')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldPlace(Resource):
    @ns.doc(description='Return the field at the given place in the record')
    def get(self, collection, record_id, field_tag, field_place):
        route_params = locals()
        route_params.pop('self')
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        field = record.get_field(field_tag, place=field_place) or abort(404)
        
        return jsonify(
            {
                '_links': {
                    'endpoints': {
                        'subfields': URL('api_record_field_place_subfield_list', **route_params).to_str()
                    },
                    'self': URL('api_record_field_place', **route_params).to_str(),
                    'prev': URL('api_record_fields_list', collection=collection, record_id=record_id).to_str()
                },
                'payload': field.to_dict()
            }
        )

    @ns.doc(description='Replace the field with the given tag at the given place', security='basic')
    @login_required
    def put(self, collection, record_id, field_tag, field_place):
        user = f'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        record.get_field(field_tag, place=field_place) or abort(404)
        
        try:
            if field_tag[:2] == '00':
                field_data = request.data.decode() # scalar value
            else:
                field = Datafield.from_json(
                    record_type=cls.record_type, 
                    tag=field_tag,
                    data=request.data.decode(),
                    auth_control=True
                )
                field_data = field.to_dict()
            
            record_data = record.to_dict()
            record_data.setdefault(field_tag, [])
            record_data[field_tag][field_place] = field_data
            
            result = cls(record_data, auth_control=True).commit()
        except Exception as e:
            abort(400, str(e))

        if result.acknowledged:
            url = URL(
                'api_record_field_place',
                collection=collection,
                record_id=record.id,
                field_tag=field_tag,
                field_place=field_place
            )

            return {'result': url.to_str()}, 201
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

@ns.route('/collections/<string:collection>/records/<int:record_id>/fields/<string:field_tag>/<int:field_place>/subfields')
@ns.param('field_place', 'The incidence number of the field in the record, starting with 0')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldPlaceSubfieldList(Resource):
    @ns.doc(description='Return a list of the subfields in the field')
    def get(self, collection, record_id, field_tag, field_place):
        route_params = locals()
        route_params.pop('self')

        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        field = record.get_field(field_tag, place=field_place) or abort(404)
        
        subfields, seen, place = [], {}, 0
        
        for sub in field.subfields:
            new_route_params = copy(route_params)
            new_route_params['subfield_code'] = sub.code
            
            if sub.code in seen:
                place += 1
            else:
                place = 0
                seen[sub.code] = True
            
            new_route_params['subfield_place'] = place

            subfields.append(
                URL('api_record_field_subfield_value', **new_route_params).to_str()
            )

        return jsonify(
            {
                '_links': {
                    'self': URL('api_record_field_place_subfield_list', **route_params).to_str(),
                    'prev': URL('api_record_field_place', **route_params).to_str(),
                },
                'payload': subfields
            }
        )

@ns.route('/collections/<string:collection>/records/<int:record_id>/fields/<string:field_tag>/<int:field_place>/subfields/<string:subfield_code>')
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
        subfields = filter(lambda x: x.code == subfield_code, field.subfields) or abort(404)

        subfield_places = []
        
        for place in range(0, len(list(subfields))):
            subfield_places.append(
                URL('api_record_field_subfield_value', subfield_place=place, **route_params).to_str()
            )
        
        return jsonify(
            {
                '_links': {
                    'self': URL('api_record_field_place_subfield_place_list', **route_params).to_str(),
                    'prev': URL(
                        'api_record_field_place_subfield_list', 
                        collection=collection, 
                        record_id=record_id, 
                        field_tag=field_tag, 
                        field_place=field_place
                    ).to_str(),
                },
                'payload': subfield_places
            }
        )

# Single records

@ns.route('/collections/<string:collection>/records/<int:record_id>/fields/<string:field_tag>/<int:field_place>/subfields/<string:subfield_code>/<int:subfield_place>')
@ns.param('subfield_place', 'The incidence number of the subfield code in the field, starting wtih 0')
@ns.param('subfield_code', 'The subfield code')
@ns.param('field_place', 'The incidence number of the field in the record, starting with 0')
@ns.param('field_tag', 'The MARC tag identifying the field')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldSubfieldValue(Resource):
    @ns.doc(description='Return the value of the subfield')
    def get(self, collection, record_id, field_tag, field_place, subfield_code, subfield_place):
        route_params = locals()
        route_params.pop('self')

        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        value = record.get_value(field_tag, subfield_code, address=[field_place, subfield_place]) or abort(404)
        
        return jsonify(
            {
                '_links': {
                    'self': URL('api_record_field_subfield_value', **route_params).to_str(),
                    'prev': URL(
                        'api_record_field_place_subfield_list', 
                        collection=collection, 
                        record_id=record_id, 
                        field_tag=field_tag, 
                        field_place=field_place
                    ).to_str()
                },
                'payload': value
            }
        )

@ns.route('/collections/<string:collection>/records/<int:record_id>')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class Record(Resource):
    @ns.doc(description='Return the record with the given identifier')
    @ns.expect(resource_argparser)
    def get(self, collection, record_id):
        args = resource_argparser.parse_args()
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        fmt = args.get('format')
        
        if fmt == 'xml':
            return Response(record.to_xml(), mimetype='text/xml')
        elif fmt == 'mrk':
            return Response(record.to_mrk(), mimetype='text/plain')
        elif fmt == 'mrc':
            return Response(record.to_mrc(), mimetype='text/plain')
            
        return jsonify(
            {
                '_links': {
                    'endpoints': {
                        'fields': URL('api_record_fields_list', collection=collection, record_id=record_id).to_str(),
                        'subfields': URL('api_record_subfields_list', collection=collection, record_id=record_id).to_str()
                    },
                    'self': URL('api_record', collection=collection, record_id=record_id).to_str(),
                    'prev': URL('api_records_list', collection=collection).to_str(),
                },
                'payload': record.to_dict()
            }
        )

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
                jmarc = load_json(request.data)
                
                result = cls(jmarc, auth_control=True).commit(user=user)
            except Exception as e:
                abort(400, str(e))
        
        if result.acknowledged:
            data = {'result': URL('api_record', collection=collection, record_id=record.id).to_str()}
            
            return data, 201
        else:
            abort(500)

    @ns.doc(description='Delete the Bibliographic or Authority Record with the given identifier', security='basic')
    @login_required
    def delete(self, collection, record_id):
        user = 'testing' if current_user.is_anonymous else current_user.email
        
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)

        try:
            result = record.delete(user=user)
        except AuthInUse as e:
            abort(403, 'Authority record in use')
        
        if result.acknowledged:
            return Response(status=200)
        else:
            abort(500)
            
### auth lookup

@ns.route('/collections/<string:collection>/lookup/<string:field_tag>')
@ns.param('collection', '"bibs" or "auths"')
@ns.param('field_tag', 'The tag of the field value to look up')
class Lookup(Resource):
    @ns.doc(description='Return a list of authorities that match a string value')
    #@ns.expect(list_argparser)
    def get(self, collection, field_tag):
        cls = ClassDispatch.by_collection(collection) or abort(404)
        
        conditions = []
        
        for code in request.args.keys():
            val = request.args[code]
            
            auth_tag = Dconfig.authority_source_tag(collection[:-1], field_tag, code)
            
            if not auth_tag:
                continue
            
            conditions.append(
                Condition(auth_tag, {code: Regex(val, 'i')})
            )
            
        processed = []
        
        for auth in AuthSet.from_query(conditions, projection=dict.fromkeys(Dconfig.auth_heading_tags(), 1), limit=25):
            field = Datafield(record_type=collection[:-1], tag=field_tag)
            
            for sub in auth.heading_field.subfields:
                field.set(sub.code, auth.id)
            
            processed.append(field.to_dict())
            
        return jsonify(processed)
            
### templates

@ns.route('/collections/<string:collection>/templates')
@ns.param('collection', '"bibs" or "auths"')
class TemplatesList(Resource):
    @ns.doc(description='Return a list of templates for the given collection')
    def get(self, collection):
        # interim implementation
        template_collection = DB.handle[f'{collection}_templates']
        templates = template_collection.find({})
        
        return jsonify(
            {
                '_links': {
                    'self': URL('api_templates_list', collection=collection).to_str(),
                    'prev': URL('api_collection', collection=collection).to_str()
                },
                'payload': [URL('api_template', collection=collection, template_name=t['name']).to_str() for t in templates]
            }
        )
    
    @ns.doc(description='Create a new temaplate with the given data', security='basic')
    @login_required
    def post(self, collection):
        # interim implementation
        template_collection = DB.handle[f'{collection}_templates']
        data = load_json(request.data) or abort(400, 'Invalid JSON')
        data['_id'] = uuid1().int / 10 # not good
        template_collection.insert_one(data) or abort(500)
        
        return {'result': URL('api_template', collection=collection, template_name=data['name']).to_str()}, 201

@ns.route('/collections/<string:collection>/templates/<string:template_name>')
@ns.param('collection', '"bibs" or "auths"')
@ns.param('template_name', 'The name of the template')
class Template(Resource):
    @ns.doc(description='Return the the template with the given name for the given collection')
    
    def get(self, collection, template_name):
        # interim implementation
        cls = ClassDispatch.by_collection(collection) or abort(404)
        template_collection = DB.handle[f'{collection}_templates']
        template = template_collection.find_one({'name': template_name}) or abort(404)
        
        try:
            record = cls(template)
        except Exception as e:
            abort(404, str(e))
            
        return jsonify(
            {
                '_links': {
                    'self': URL('api_template', collection=collection, template_name=template_name).to_str(),
                    'prev': URL('api_templates_list', collection=collection).to_str()
                },
                'payload': record.to_dict()
            }
        )

    @ns.doc(description='Replace a template with the given name with the given data', security='basic')
    @login_required
    def put(self, collection, template_name):
        # interim implementation
        template_collection = DB.handle[f'{collection}_templates']
        old_data = template_collection.find_one({'name': template_name}) or abort(404)
        new_data = load_json(request.data) or abort(400, 'Invalid JSON')
        new_data['_id'], new_data['name'] = old_data['_id'], old_data['name']
        result = template_collection.replace_one({'_id': old_data['_id']}, new_data)
        result.acknowledged or abort(500)

        return {'result': URL('api_template', collection=collection, template_name=template_name).to_str()}, 201

    @ns.doc(description='Delete a template with the given name', security='basic')
    @login_required
    def delete(self, collection, template_name):
        template_collection = DB.handle[f'{collection}_templates']
        template_collection.find_one({'name': template_name}) or abort(404)
        template_collection.delete_one({'name': template_name}) or abort(500)
    