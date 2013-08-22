/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Egon.
 *
 * The Initial Developer of the Original Code is Christopher R. Field.
 * Portions created by the Initial Developer are Copyright (C) 2013
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * 		Christopher R. Field <cfield2 at gmail dot com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
var egon = egon || {};

egon.namespace = function(ns_string) {
	var parts = ns_string.split('.'), parent = egon, i;

	if (parts[0] === 'egon') {
		parts = parts.slice(1);
	}

	for (i = 0; i < parts.length; i += 1) {
		if (typeof parent[parts[i]] === 'undefined') {
			parent[parts[i]] = {};
		}

		parent = parent[parts[i]];
	}

	return parent;
};

egon.Session = function() {
	this.actions = [];
	this.conn = null;

	// TODO: Create connection to database file.

	this.propertyChanged = function(event) {
		// TODO: Mark entity for update.
		console.info("'" + event.property + "' changed from: '"
				+ event.oldValue + "' to: '" + event.newValue + "'");
		// TODO: Create SQL expression for updating the entity in the database.
	};

	this.commit = function() {
		var i;

		for (i = 0; i < this.actions.length; i += 1) {
			console.log(this.actions[i].toString());
			// TODO: Execute SQL expressions
		}
	};

	this.add = function(entity) {
		entity.addListener(this);

		var values = {}, keys = Object.keys(entity._fields), key, i;

		for (i = 0; i < keys.length; i += 1) {
			// TODO: Convert values based on column types.
			key = keys[i];
			values[entity._fields[key].columnName] = entity[key];
		}

		var insertExpression = new spengler.Expression();
		insertExpression.insert().into(entity._table).values(values);

		this.actions.push(insertExpression);
	};

	this.query = function() {
		// TODO: Execute a query to the database, typically to retrieve all
		// of the entities.
	};

	this.remove = function(entity) {
		entity.removeListnener(this);
		// TODO: Create SQL expression for deleting the entity from the
		// database.
		// TODO: Add SQL expression to statements to execute on 'commit'.
	};

	this.createSchema = function(tables) {
		// TODO: Create SQL expression for creating database tables, this
		// includes relationships.
		// TODO: execute series of SQL expressions for creating tables.
	};
};

egon.Entity = function(session, tableName, fields) {
	function Entity() {
		var entity = this, keys = Object.keys(fields), i;
		
		this.id = null;
		this._table = tableName;
		this._fields = fields;
		this._data = {};
		this._listeners = [];
		
		for (i = 0; i < keys.length; i += 1) {
			/*
			 * A closure is needed in order to save the state of the 'property'
			 * variable. If a closure is not used, then the 'property' state, or
			 * value, is the last value passed to it in the loop. Creating the
			 * closure saves the state when the anonymous function that creates
			 * the closure was called in the loop.
			 */
			(function() {
				var key = keys[i];
				Object.defineProperty(entity, key, {
					set : function(newValue) {
						var oldValue = entity._data[key];
						entity._data[key] = newValue;
						entity._firePropertyChangeEvent({
							source : entity,
							property : key,
							newValue : newValue,
							oldValue : oldValue,
						});
					},
					get : function() {
						return entity._data[key];
					},
				});
				
				entity._data[key] = fields[key].defaultValue;
			}());
		}
		
		if (session !== undefined) {
			session.add(this);
		}
	};
	
	Entity.prototype._firePropertyChangeEvent = function(event) {		
		var i;
		
		for (i = 0; i < this._listeners.length; i += 1) {
			this._listeners[i].propertyChanged(event);
		}
	};

	Entity.prototype.addListener = function(listener) {
		this._listeners.push(listener);
	};

	Entity.prototype.removeListener = function(listener) {
		var i;

		for (i = 0; i < this._listeners.length; i += 1) {
			if (this._listeners[i] === listener) {
				this._listeners.splice(i, 1);
			}
		}
	};

	return Entity;
};

egon.Field = function(columnName, type, defaultValue) {
	this.columnName = columnName;
	this.type = type;
	this.defaultValue = defaultValue;
};

egon.namespace('egon.schema');

egon.schema.types = {
	TEXT : 'text',
	BOOLEAN : 'boolean',
	INTEGER : 'integer',
	DECIMAL : 'decimal',
	DATE : 'date',
};

egon.schema.Table = function(name, columns) {
	this.name = name;
	this.columns = columns;
};

egon.schema.Column = function(name, type) {
	this.name = name;
	this.type = type;
};