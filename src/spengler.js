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
 * The Original Code is Spengler.
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
var spengler = spengler || {};

spengler.namespace = function(ns_string) {
	var parts = ns_string.split('.'),
		parent = spengler,
		i;
	
	if (parts[0] === 'spengler') {
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

spengler.Expression = function() {
	this.sql = null;
	
	this.insert = function() {
		this.sql = 'insert';
		
		return this;
	};
	
	this.into = function(tableName) {
		this.sql = this.sql + ' into ' + tableName;
		
		return this;
	};
	
	this.values = function(values) {
		var keys = Object.keys(values),
			i;
	
		this.sql = this.sql + " (";
		for (i = 0; i < keys.length - 1; i += 1) {
			 this.sql = this.sql + keys[i] + ', ';
		}
		
		this.sql = this.sql + keys[i] + ") VALUES (";
		
		for (i = 0; i < keys.length - 1; i += 1) {
			this.sql = this.sql + "'" + values[keys[i]] + "', ";
		}
		
		this.sql = this.sql + "'" + values[keys[i]] + "')";
		
		return this;
	};
	
	this.toString = function() {
		return this.sql;
	};
};