'''
DLX REST API
'''
from dlx_rest.config import Config
from dlx_rest.app import app, login_manager
from dlx_rest.models import User

from datetime import datetime, timezone
from json import loads as load_json, JSONDecodeError
from copy import copy
from uuid import uuid1
from urllib.parse import quote, unquote
from flask import Flask, Response, g, url_for, jsonify, request, abort as flask_abort
from flask_restx import Resource, Api, reqparse
from flask_login import login_required, current_user
from flask_cors import CORS
from base64 import b64decode
from dlx import DB, Config as DlxConfig
from dlx.marc import MarcSet, BibSet, Bib, AuthSet, Auth, Field, Controlfield, Datafield, \
    Query, Condition, InvalidAuthValue, InvalidAuthXref, AuthInUse
from dlx.file import File, Identifier
from pymongo import ASCENDING as ASC, DESCENDING as DESC
from bson import Regex
from dlx_rest.api.util import ClassDispatch, URL, RecordsListArgs, ApiResponse, abort, brief_bib, brief_auth
import jsonschema

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
        email,password = b64decode(auth_header.replace('Basic ','',1)).decode('utf-8').split(':')
        try:
            user = User.objects.get(email=email)
            if not user.check_password(password):
                return None
        except:
            return None
        g.user = user
        return user

### Routes

# Authentication
@ns.route('/token')
class AuthToken(Resource):
    @login_required
    def get(self):
        token = g.user.generate_auth_token()
        
        return jsonify({ 'token': token.decode('ascii') })

# Schemas
@ns.route('/schemas')
class SchemasList(Resource):
    @ns.doc(description='The schemas of the API\'s JSON resources')
    def get(self):
        names = (
            'api.response',
            'api.urllist',
            'jmarc',
            'jmarc.template', 
            'jfile', 
            'jmarc.controlfield', 
            'jmarc.datafield', 
            'jmarc.subfield', 
            'jmarc.subfield.value',
            'api.null'
        )
        
        links = {
            '_self': URL('api_schemas_list').to_str(),
            '_next': None,
            '_prev': None,
            'related': {
                'collections': URL('api_collections_list').to_str()
            },
            'format': None
        }
        meta = {
            'name': 'api_schemas_list',
            'returns': URL('api_schema', schema_name='api.urllist').to_str(),
            'timestamp': datetime.now(timezone.utc)
        }
        response = ApiResponse(links=links, meta=meta, data=[URL('api_schema', schema_name=name).to_str() for name in names])
        
        return response.jsonify()

# Schema
@ns.route('/schemas/<string:schema_name>')
class Schema(Resource):
    @ns.doc(description='Returns an instance of JSON Schema')
    def get(self, schema_name):
        if schema_name == 'api.urllist':
            data = Config.URLLIST_SCHEMA
        elif schema_name == 'api.response':
            data = Config.RESPONSE_SCHEMA
        elif schema_name == 'jmarc':
            data = DlxConfig.jmarc_schema
            data['properties']['files'] = {
                'type': 'array', 
                'items': {
                    'type': 'object', 
                    'properties': {
                        'mimetype': {'type': 'string', 'pattern': '^(text|application)/'}, 
                        'language': {'type': 'string', 'pattern': '^[a-z]{2}$'},
                        'url': {'type': 'string', 'format': 'uri'}
                    }
                }
            }
        elif schema_name == 'jmarc.template':
            data = DlxConfig.jmarc_schema
            data['required'] = ['name']
            data['properties'].pop('_id')
            data['properties']['name'] = {'type': 'string'}
        elif schema_name == 'jmarc.controlfield':
            data = DlxConfig.jmarc_schema['.controlfield']
        elif schema_name == 'jmarc.datafield':
            data = DlxConfig.jmarc_schema['.datafield']
        elif schema_name == 'jmarc.subfield':
            data = DlxConfig.jmarc_schema['.subfield']
        elif schema_name == 'jmarc.subfield.value':
            data = DlxConfig.jmarc_schema['.subfield']['properties']['value']
        elif schema_name == 'jfile':
            data = DlxConfig.jfile_schema
        elif schema_name == 'api.null':
            data = {'type': 'object', 'properties': {}, 'additionalProperties': False}
        else:
            abort(404)
        
        return jsonify(data)
        
# Collections
@ns.route('/collections')
class CollectionsList(Resource):
    @ns.doc(description='Return a list of the collection endpoints.')
    def get(self):
        meta = {
            'name': 'api_collections_list',
            'returns': URL('api_schema', schema_name='api.urllist').to_str(),
            'timestamp': datetime.now(timezone.utc)
        }
        links = {
            '_self': URL('api_collections_list').to_str(),
            '_prev': None,
            '_next': None,
            'related': {'schemas': URL('api_schemas_list', _internal=True).to_str()},
            'format': None
        }
        response = ApiResponse(links=links, meta=meta, data=[URL('api_collection', collection=col).to_str() for col in ('bibs', 'auths')])
        
        return response.jsonify()

# Collection        
@ns.route('/collections/<string:collection>')
class Collection(Resource):
    @ns.doc(description='')
    def get(self, collection):
        collection in ClassDispatch.list_names() or abort(404)
        
        meta = {
            'name': 'api_collection',
            'returns': URL('api_schema', schema_name='api.null').to_str(),
            'timestamp': datetime.now(timezone.utc)
        }
        links = {
            '_next': None,
            '_prev': None,
            '_self': URL('api_collection', collection=collection).to_str(),
            'format': None,
            'related': {
                'records': URL('api_records_list', collection=collection).to_str(),
                'templates': URL('api_templates_list', collection=collection).to_str(),
                'lookup': URL('api_lookup', collection=collection).to_str()
            }
        }
        response = ApiResponse(links=links, meta=meta, data={})
        
        return response.jsonify()

# Records
@ns.route('/collections/<string:collection>/records')
@ns.param('collection', '"bibs" or "auths"')
class RecordsList(Resource):
    @ns.doc(description='Return a list of MARC Bibliographic or Authority Records')
    @ns.expect(RecordsListArgs.args)
    def get(self, collection):
        route_params = locals()
        route_params.pop('self')
        args = RecordsListArgs.args.parse_args()
        collection in ClassDispatch.list_names() or abort(404)
        
        # search
        search = unquote(search) if args.search else None
        query = Query.from_string(search) if search else {}
        
        # start
        start = 0 if args.start is None else args.start-1
          
        # limit  
        if int(args.limit or 0) > 1000:
            abort(404, 'Maximum limit is 1000')
        elif args.limit is None:
            limit = 100
        else:
            limit = args.limit
            
        # sort
        if args['sort'] == 'updated':
            sort_by = 'updated'
            sort = [('updated', ASC)] if (args['direction'] or '').lower() == 'asc' else [('updated', DESC)]
        else:
            sort_by = sort = None
        
        # format
        fmt = args['format'] or None
        
        if fmt == 'brief':
            tags = ('191', '245', '269', '700', '710', '791', '989') if collection == 'bibs' \
                else ('100', '110', '111', '130', '150', '151', '190', '191', '400', '410', '411', '430', '450', '451', '490', '491')
            
            project = dict.fromkeys(tags, True)
        elif fmt:
            project = None
        else:
            project = {'_id': 1}

        ###
        
        cls = ClassDispatch.batch_by_collection(collection) 
        recordset = cls.from_query(query, projection=project, skip=start, limit=limit, sort=sort)
        
        ###
        
        if fmt == 'xml':
            return Response(recordset.to_xml(), mimetype='text/xml')
        elif fmt == 'mrk':
            return Response(recordset.to_mrk(), mimetype='text/plain')
        elif fmt == 'brief':
            schema_name='api.brief'
            make_brief = brief_bib if recordset.record_class == Bib else brief_auth
            data = [make_brief(r) for r in recordset]
        else:
            schema_name='api.urllist'
            data = [URL('api_record', record_id=r.id, **route_params).to_str() for r in recordset]
            
        meta = {
            'name': 'api_records_list',
            'returns': URL('api_schema', schema_name=schema_name).to_str(),
            'timestamp': datetime.now(timezone.utc)
        }
        links = {
            '_self': URL('api_records_list', collection=collection, start=start+1, limit=limit, search=search, format=fmt, sort=sort_by).to_str(),
            '_next': URL('api_records_list', collection=collection, start=start+1+limit, limit=limit, search=search, format=fmt, sort=sort_by).to_str(),
            '_prev': URL('api_records_list', collection=collection, start=start+1-limit if start-limit>0 else 1, limit=limit, search=search, format=fmt, sort=sort_by).to_str() if start > 1 else None,
            'related': {
                'collection': URL('api_collection', collection=collection).to_str()
            },
            'format': {
                'brief': URL('api_records_list', collection=collection, start=start+1, limit=limit, search=search, format='brief', sort=sort_by).to_str(),
                'list': URL('api_records_list', start=start+1, limit=limit, search=search, sort=sort_by, **route_params).to_str(),
                'XML': URL('api_records_list', start=start+1, limit=limit, search=search, sort=sort_by, format='xml', **route_params).to_str(),
                'MRK': URL('api_records_list', start=start+1, limit=limit, search=search, sort=sort_by, format='mrk', **route_params).to_str(),
            },
            'sort': {
                'updated': URL('api_records_list', collection=collection, start=start+1, limit=limit, search=search, format=fmt, sort='updated').to_str()
            }
        }
        response = ApiResponse(links=links, meta=meta, data=data)
        
        return response.jsonify()
    
    @ns.doc(description='Create a Bibliographic or Authority Record with the given data.', security='basic')
    @login_required
    def post(self, collection):
        user = 'testing' if current_user.is_anonymous else current_user.email
        
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

# Record
record_args = reqparse.RequestParser()
record_args.add_argument('format', type=str, help='Valid formats are "json", "xml", "mrc", "mrk"')
@ns.route('/collections/<string:collection>/records/<int:record_id>')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class Record(Resource):
    @ns.doc(description='Return the record with the given identifier')
    @ns.expect(record_args)
    def get(self, collection, record_id):
        args = record_args.parse_args()
        cls = ClassDispatch.by_collection(collection) or abort(404)
        record = cls.from_id(record_id) or abort(404)
        fmt = args.get('format')

        if fmt == 'xml':
            return Response(record.to_xml(), mimetype='text/xml')
        elif fmt == 'mrk':
            return Response(record.to_mrk(), mimetype='text/plain')
        elif fmt == 'mrc':
            return Response(record.to_mrc(), mimetype='text/plain')
            
        files = []
        
        for lang in ('AR', 'ZH', 'EN', 'FR', 'RU', 'ES', 'DE'):
            f = File.latest_by_identifier_language(
                Identifier('symbol', record.get_value('191', 'a') or record.get_value('791', 'a')), lang
            )
            
            if f:
                files.append({'mimetype': f.mimetype, 'language': lang.lower(), 'url': 'https://' + f.uri})
        
        data = record.to_dict()
        data['updated'] = record.updated
        data['files'] = files
        
        meta = {
            'name': 'api_record',
            'returns':  URL('api_schema', schema_name='jmarc').to_str(),
            'timestamp': datetime.now(timezone.utc)
        }
        links = {
            '_next': None,
            '_prev': None,
            '_self': URL('api_record', collection=collection, record_id=record_id).to_str(),
            'format': {
                'XML': URL('api_record', collection=collection, record_id=record_id, format='xml').to_str(),
                'MRK': URL('api_record', collection=collection, record_id=record_id, format='mrk').to_str()
            },
            'related': {
                'fields': URL('api_record_fields_list', collection=collection, record_id=record_id).to_str(),
                'records': URL('api_records_list', collection=collection).to_str(),
                'subfields': URL('api_record_subfields_list', collection=collection, record_id=record_id).to_str()
            }
        }

        response = ApiResponse(links=links, meta=meta, data=data)
        
        return response.jsonify()

    @ns.doc(description='Replace the record with the given data.', security='basic')
    @login_required
    def put(self, collection, record_id):
        user = 'testing' if current_user.is_anonymous else current_user.email
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

# Fields
@ns.route('/collections/<string:collection>/records/<int:record_id>/fields')
@ns.param('record_id', 'The record identifier')
@ns.param('collection', '"bibs" or "auths"')
class RecordFieldsList(Resource):
    @ns.doc(description='Return a list of the fields in the record with the given record ID')
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
                '_meta': {
                    'name': 'api_record_fields_list',
                    'returns': 'array'
                },
                'data': fields_list
            }
        )
   
# Field places
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
                'data': field_places
                
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

# Field    
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
        df = True if isinstance(field, Datafield) else False
        
        return jsonify(
            {
                '_links': {
                    'related': {
                        'subfields': URL('api_record_field_place_subfield_list', **route_params).to_str()
                    },
                    'self': URL('api_record_field_place', **route_params).to_str(),
                    'prev': URL('api_record_fields_list', collection=collection, record_id=record_id).to_str()
                },
                '_meta': {
                    'name': 'api_record_field_place',
                    'returns': URL('api_schema', schema_name='jmarc.datafield' if df else 'jmarc.controlfield').to_str()
                },
                'data': field.to_dict() if df else field.value
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

# Record subfields        
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

        for tag in filter(lambda x: x[0:2] != '00', record.get_tags()): 
            for field_place, field in enumerate(record.get_fields(tag)):        
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
                'data': subfields
            }
        )

# Field subfields
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
                'data': subfields
            }
        )

# Subfield places
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
                'data': subfield_places
            }
        )

# Subfields
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
                'data': value
            }
        )
            
# Auth lookup fields
@ns.route('/collections/<string:collection>/lookup')
@ns.param('collection', '"bibs" or "auths"')
class Lookup(Resource):
    @ns.doc(description='Return a list of field tags that are authority-controlled')
    def get(self, collection):
        amap = DlxConfig.bib_authority_controlled if collection == 'bibs' else DlxConfig.auth_authority_controlled
        
        return jsonify(
            {   
                '_links': {
                    'related': {
                        'map': URL('api_lookup_map', collection=collection).to_str()
                    },
                    'self': URL('api_lookup', collection=collection).to_str(),
                    'prev': URL('api_collection', collection=collection).to_str(),
                },
                'data': [URL('api_lookup_field', collection=collection, field_tag=tag).to_str() for tag in amap.keys()]
            }
        )
        
# Auth lookup
@ns.route('/collections/<string:collection>/lookup/<string:field_tag>')
@ns.param('collection', '"bibs" or "auths"')
@ns.param('field_tag', 'The tag of the field value to look up')
class LookupField(Resource):
    @ns.doc(description='Return a list of authorities that match a string value')
    #@ns.expect(list_argparser)
    def get(self, collection, field_tag):
        cls = ClassDispatch.by_collection(collection) or abort(404)
        
        conditions = []
        codes = filter(lambda x: len(x) == 1, request.args.keys())
        sparams = {}
        
        for code in codes:
            val = request.args[code]
            sparams[code] = val
            
            auth_tag = DlxConfig.authority_source_tag(collection[:-1], field_tag, code)
            
            if not auth_tag:
                continue
            
            conditions.append(
                Condition(auth_tag, {code: Regex(val, 'i')})
            )
            
        if not conditions:
            abort(400, 'Request parameters required')
            
        processed = []
        start = int(request.args.get('start', 0))
        auths = AuthSet.from_query(conditions, projection=dict.fromkeys(DlxConfig.auth_heading_tags(), 1), limit=25, skip=start)
        
        for auth in auths:
            field = Datafield(record_type=collection[:-1], tag=field_tag)
            
            for sub in auth.heading_field.subfields:
                field.set(sub.code, auth.id)
            
            processed.append(field.to_dict())
            
        return jsonify(
            {
                '_links': {
                    'self': URL('api_lookup_field', collection=collection, field_tag=field_tag).to_str(),
                    'next': URL('api_lookup_field', collection=collection, start=start+25, field_tag=field_tag, **sparams).to_str(),
                    'prev': URL('api_lookup_field', collection=collection, start=start-25 if start-25>1 else 1, field_tag=field_tag, **sparams).to_str()
                },
                'data': processed
            }
        )

# Auth xref map
@ns.route('/collections/<string:collection>/lookup/map')
@ns.param('collection', '"bibs" or "auths"')
class LookupMap(Resource):
    @ns.doc(description='Return a list of field tags that are authority-controlled')
    def get(self, collection):
        amap = DlxConfig.bib_authority_controlled if collection == 'bibs' else DlxConfig.auth_authority_controlled
        
        return jsonify(
            {   
                '_links': {
                    'self': URL('api_lookup_map', collection=collection).to_str(),
                    'prev': URL('api_lookup', collection=collection).to_str()
                },
                'data': amap
            }
        )
        
# Templates
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
                'data': [URL('api_template', collection=collection, template_name=t['name']).to_str() for t in templates]
            }
        )
    
    @ns.doc(description='Create a new temaplate with the given data', security='basic')
    @login_required
    def post(self, collection):
        # interim implementation
        template_collection = DB.handle[f'{collection}_templates']
        data = load_json(request.data) or abort(400, 'Invalid JSON')
        schema = json.loads(requests.get('api_schema', schema_name='jmarc.template').content)
        
        try:
            jsonschema.validate(schema=schema, instance=data, format_checker=jsonschema.FormatChecker())
        except:
            abort(400)
        
        template_collection.insert_one(data) or abort(500)
        
        return {'result': URL('api_template', collection=collection, template_name=data['name']).to_str()}, 201

# Template
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
            
        data = record.to_dict()
        data.pop('_id')
        data['name'] = template_name
            
        return jsonify(
            {
                '_links': {
                    'self': URL('api_template', collection=collection, template_name=template_name).to_str(),
                    'prev': URL('api_templates_list', collection=collection).to_str()
                },
                'data': data
            }
        )

    @ns.doc(description='Replace a template with the given name with the given data', security='basic')
    @login_required
    def put(self, collection, template_name):
        # interim implementation
        template_collection = DB.handle[f'{collection}_templates']
        old_data = template_collection.find_one({'name': template_name}) or abort(404)
        new_data = load_json(request.data) or abort(400, 'Invalid JSON')
        schema = json.loads(requests.get('api_schema', schema_name='jmarc.template').content)
        
        try:
            jsonschema.validate(schema=schema, instance=data, format_checker=jsonschema.FormatChecker())
        except:
            abort(400)

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
    