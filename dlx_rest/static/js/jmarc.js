"use strict";

const nodejs = typeof window === "undefined" ? true : false;

if (nodejs) {
	// fetch is not built into node
	var fetch = require('node-fetch');
}

(
	function(exports) {
		const authMap = {
			"bibs": {
        		'191': {'b': '190', 'c': '190'},
        		'600': {'a': '100', 'g': '100'},
        		'610': {'a': '110', 'g': '110'},
        		'611': {'a': '111', 'g': '111'},
        		'630': {'a': '130', 'g': '130'},
        		'650': {'a': '150'},
        		'651': {'a': '151'},
        		'700': {'a': '100', 'g': '100'},
        		'710': {'a': '110', '9': '110'},
        		'711': {'a': '111', 'g': '111'},
        		'730': {'a': '130'},
        		'791': {'b': '190', 'c' : '190'},
        		'830': {'a': '130'},
        		'991': {'a': '191', 'b': '191', 'c': '191', 'd': '191'}
    		},
			"auths": {
        		//'491': {'a': '191'}, # ?
        		'500': {'a': '100'},
        		'510': {'a': '110'},
        		'511': {'a': '111'},
        		'550': {'a': '150'},
        		'551': {'a': '151'},
    		}
		};
	
		class Subfield {
			constructor(code, value, xref) {
				this.code = code;
				this.value = value;
				this.xref = xref;	
			}
		}
		
		class LinkedSubfield extends Subfield {
			constructor(code, value, xref) {
				super(code, value);
				this.xref = xref;
			}
		}
		
		class ControlField {
			constructor(tag, value) {
				if (tag) {
					! tag.match(/^00/) && function() {throw new Error("invalid Control Field tag")};
				}
				
				this.tag = tag;
				this.value = value;
			}
		}
		
		class DataField {
			constructor(tag, indicators, subfields) {
				if (tag) {
					tag.match(/^00/) && function() {throw new Error("invalid Data Field tag")};
				}
				
				indicators ||= [" ", " "];
				
				this.tag = tag;
				this.indicators = indicators || [];
				this.subfields = subfields || [];
			}
			
			createSubfield(code) {
				code || function() {throw new Error("subfield code required")};
				
				let subfield = new Subfield(code);
				this.subfields.push(subfield);
				
				return subfield;
			}
			
			getSubfields(code) {
				return this.subfields.filter(x => x.code == code);
			}
			
			getSubfield(code, place) {
				return this.getSubfields(code)[place || 0];
			}
			
			toStr() {
				let str = ""
				
				for (let subfield of this.subfields) {
					str += `\$${subfield.code} ${subfield.value} `;
					
					if (subfield.xref) {
						str += `@${subfield.xref} `;
					}
					
					str += '|';
				}
				
				return str
			}
			
			lookup() {
				let collection = this instanceof BibDataField ? "bibs" : "auths";
				let lookupString = this.subfields.map(x => {return `${x.code}=${x.value}`}).join("&");
				let url = Jmarc.apiUrl + `/marc/${collection}/lookup/${this.tag}?${lookupString}`;
				
				return fetch(url).then(
					response => {
						return response.json()
					}
				).then(
					json => {
						let results = json['data'];
						let choices = [];
						
						for (let auth of results) {
							// each result is a record
							// the wanted auth field is the only 1XX field
							for (let tag of Object.keys(auth).filter(x => x.match(/^1\d\d/))) {
								let field = this instanceof BibDataField ? new BibDataField(this.tag) : new AuthDataField(this.tag);
								
								for (let sf of auth[tag][0]['subfields']) {
									field.subfields.push(new Subfield(sf['code'], sf['value'], auth['_id']));
								}
								
								choices.push(field)
							}
						}
						
						return choices
					}
				)
			}
		}

		class BibDataField extends DataField {
			constructor(tag, indicators, subfields) {
				super(tag, indicators, subfields)
			}
		}
		
		class AuthDataField extends DataField {
			constructor(tag, indicators, subfields) {
				super(tag, indicators, subfields)
			}
		}
		
		class Jmarc {
			constructor(collection) {
				Jmarc.apiUrl || function() {throw new Error("Jmarc.apiUrl must be set")};
				this.collection = collection || function() {throw new Error("Collection required")};
				this.collectionUrl = Jmarc.apiUrl + `/marc/${collection}`;
				this.recordId = null;
				this.fields = [];
			}
			
			isAuthorityControlled(tag, code) {
				let map = authMap;
				
				if (map[this.collection][tag] && map[this.collection][tag][code]) {
					return true
				}
				
				return false
			}
			
			static get(collection, recordId) {
				Jmarc.apiUrl || function() {throw new Error("Jmarc.apiUrl must be set")};
				
				let jmarc = new Jmarc(collection || function() {throw new Error("Collection required")});
				jmarc.recordId = parseInt(recordId) || function() {throw new Error("Record ID required")};
				jmarc.url = Jmarc.apiUrl + `/marc/${collection}/records/${recordId}`;
				
				let savedResponse;
				
				return fetch(jmarc.url).then(
					response => {
						savedResponse = response;
						
						return response.json()
					}
				).then(
					json => {
						if (savedResponse.status != 200) {
							throw new Error(json['message'])
						}
						
						jmarc.parse(json['data']);
						jmarc.savedState = jmarc.compile();
						
						return jmarc
					}
				)
			}
			
			post() {
				if (this.recordId) {
					throw new Error("Can't POST existing record")
				}
				
				let savedResponse;

				return fetch(
					this.collectionUrl + '/records',
					{
						method: 'POST',
						headers: {'Content-Type': 'application/json'},
						body: this.stringify()
					}	
				).then(
					response => {
						savedResponse = response;
						
						return response.json()
					}
				).then(
					json => {
						if (savedResponse.status != 201) {
							throw new Error(json['message']);
						}
						
						this.url = json['result'];
						this.recordId = parseInt(this.url.split('/').slice(-1));
						this.savedState = this.compile()
						
						return this;
					}
				)
			}
		
			put() {
				if (! this.recordId) {
					throw new Error("Can't PUT new record")
				}
				
				let savedResponse;
				
				return fetch(
					this.url,
					{
						method: 'PUT',
						headers: {'Content-Type': 'application/json'},
						body: this.stringify()
					}	
				).then(
					response => {
						savedResponse = response;
						
						return response.json();
					}
				).then(
					json => {
						if (savedResponse.status != 200) {
							throw new Error(json['message'])
						}
						
						this.savedState = this.compile();
						
						return this;
					} 
				)
			}
			
			delete() {
				if (! this.recordId) {
					throw new Error("Can't DELETE new record")
				}
				
				let savedResponse;
				
				return fetch(
					this.url,
					{method: 'DELETE'}	
				).then(
					response => {
						if (response.status == 204) {
							this.recordId = null;
							this.url = null;
						
							return this;
						}
						
						return response.json()
					}
				).then(
					check => {
						if (check.constructor.name == "Jmarc") {
							return check
						}
						
						throw new Error(check['message'])
					}
				)
			}

			get saved() {
				return JSON.stringify(this.savedState) === JSON.stringify(this.compile());
			}

			parse(data) {
				this.updated = data['updated']
				
				let tags = Object.keys(data).filter(x => x.match(/^\d{3}/));
				tags = tags.sort((a, b) => parseInt(a) - parseInt(b));
				
				for (let tag of tags) {
					for (let field of data[tag]) {
						if (tag.match(/^00/)) {
							let cf = new ControlField(tag, field);
							this.fields.push(cf)
						} else {
							let df = this.collection == "bibs" ? new BibDataField(tag) : new AuthDataField(tag);
							df.indicators = field.indicators.map(x => x.replace(" ", "_"));
					
							let sf;
							
							for (let subfield of field.subfields) {
								sf = new Subfield(subfield.code, subfield.value, subfield.xref);
								df.subfields.push(sf)
							}
							
							this.fields.push(df)
						}
					}
				}
				
				return this		
			}
			
			compile() {
				let recordData = {'_id': this.recordId}; //, 'updated': this.updated};
				
				let tags = Array.from(new Set(this.fields.map(x => x.tag)));
		
				for (let tag of tags.sort(x => parseInt(x))) {
					recordData[tag] = recordData[tag] || [];
					
					for (let field of this.getFields(tag)) {
						if (field.constructor.name == 'ControlField') {
							recordData[tag].push(field.value);
						} else {
							let fieldData = {};
							
							fieldData['indicators'] = field.indicators;
							fieldData['subfields'] = field.subfields.map(x => {return {'code': x.code, 'value': x.value, 'xref': x.xref}});
							
							recordData[tag].push(fieldData);
						}
					}
				}
		
				return recordData
			}
			
			stringify() {
				return JSON.stringify(this.compile())
			}
			
			createField(tag) {
				tag || function() {throw new Error("tag required")};

				let field;
				
				if (tag.match(/^00/)) {
					field = new ControlField(tag)
				} else {
					if (this instanceof Bib) {
						field = new BibDataField(tag)
					} else if (this instanceof Auth) {
						field = new AuthDataField(tag)
					}
				}

				this.fields.push(field);
				
				return field
			}
			
			getControlFields() {
				return this.fields.filter(x => x.tag.match(/^0{2}/))
			}
			
			getDataFields() {
				return this.fields.filter(x => ! x.tag.match(/^0{2}/))
			}
			
			getFields(tag) {
				return this.fields.filter(x => x.tag == tag)
			}
			
			getField(tag, place) {
				return this.getFields(tag)[place || 0]
			}
			
			getSubfield(tag, code, tagPlace, codePlace) {
				let field = this.getField(tag, tagPlace);
				
				if (field) {
					return field.getSubfield(code, codePlace);
				}
				
				return
			}
		}
		
		class Bib extends Jmarc {
			constructor() {
				super("bibs");
			}
			
			static get(recordId) {
				return Jmarc.get("bibs", recordId)
			}
			
			validate() {}
		}
		
		class Auth extends Jmarc {
			constructor() {
				super("auths");
			}
			
			static get(recordId) {
				return Jmarc.get("auths", recordId)
			}
			
			validate() {}
		}

		exports.Jmarc = Jmarc;
		exports.Bib = Bib;
		exports.Auth = Auth;
		exports.ControlField = ControlField;
		exports.DataField = DataField;
		exports.Subfield = Subfield;
	}
)

(
	nodejs ? exports : this['jmarcjs'] = {}
)
