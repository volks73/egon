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
 * The Original Code is SQL.
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
var EXPORTED_SYMBOLS = ["SQL"];

/**
 * @namespace
 */
var SQL = {};

(function() {
	/**
	 * The possible values for the 'collate' option.
	 * 
	 * @typedef {String} CollateConstant
	 * @readonly
	 * @constant
	 */
	SQL.COLLATE = {
		BINARY: 'BINARY',
		NOCASE: 'NOCASE',
		RTRIM: 'RTRIM',	
	};
	
	/**
	 * The possible operators for an expression used in a 'WHERE' clause.
	 * 
	 * @typedef {String} OperatorsConstant.
	 * @readonly
	 * @constant
	 */
	SQL.OPERATORS = {
		CONCAT: '||',
		MULTIPLY: '*',
		DIVIDE: '/',
		MODULO: '%',
		ADD: '+',
		SUBTRACT: '-',
		LESS_THAN: '<',
		LESS_THAN_EQUALS: '<=',
		GREATER_THAN: '>',
		GREATER_THAN_EQUALS: '>=',
		EQUALS: '=',
		NOT_EQUALS: '!=',
		IS: 'IS',
		IS_NOT: 'IS NOT',
		IN: 'IN',
		LIKE: 'LIKE',
		GLOB: 'GLOB',
		MATCH: 'MATCH',
		REGEXP: 'REGEXP',
		AND: 'AND',
		OR: 'OR',
		NOT: 'NOT',
		COLLATE: '~',
	};
	
	/**
	 * The possible literal values for an expression.
	 * 
	 * @typedef {String} LiteralConstants.
	 * @readonly
	 * @constant
	 */
	SQL.LITERAL_VALUES = {
		NULL: 'NULL',
		CURRENT_TIME: 'CURRENT_TIME',
		CURRENT_DATE: 'CURRENT_DATE',
		CURRENT_TIMESTAMP: 'CURRENT_TIMESTAMP',
	};
	
	/**
	 * The possible raise function values for an expression.
	 * 
	 * @typedef {String} RaiseFunctionsConstant.
	 * @readonly
	 * @constant
	 */
	SQL.RAISE_FUNCTIONS = {
		IGNORE: 'IGNORE',
		ROLLBACK: 'ROLLBACK',
		ABORT: 'ABORT',
		FAIL: 'FAIL',
	};
	
	function _getPossibleAliasedTree(value) {
		var keys,
			key,
			tree = [];
		
		if (typeof value === 'object') {
			keys = Object.keys(value);
			key = keys[0];
			tree.push(value[key]);
			tree.push(" AS ");
			tree.push(key);
		} else {
			tree.push(value);
		}
		
		return tree;
	}
	
	/**
	 * Creates a new bind parameter object.
	 * 
	 * A bind parameter has a key, or placeholder, and a value. The value replaces the placeholder 
	 * whening binding the parameters to a SQL statement. This prevents SQL injection attacks because
	 * the value is never executed as SQL.
	 * 
	 * If a key is not provided, then a numeric, or index, key is used.
	 * 
	 * @constructor
	 * 
	 * @param {Object} value - The literal value.
	 * @param {String} [key] - The key, or placeholder, for the literal value that will be replaced on binding.
	 */
	function Param(value, key) {
		this.value = value;
		this.key = key;
	};
	
	/**
	 * Creates a string representation.
	 * 
	 * @returns {String}
	 */
	Param.prototype.toString = function() {
		var str = "{";
		
		if (this.key !== undefined) {
			str += this.key; 
		}
		else {
			str += "?";
		}
		
		return str + ": '" + this.value + "'}";
	};
	
	/**
	 * Creates a new SQL clause. This is the parent prototype for all SQL strings.
	 * 
	 * @constructor
	 */
	function Clause() {
		this._tree = [];
	};
	
	/**
	 * Gets the full tree. The child clauses are added to this clause's tree.
	 * 
	 * @returns {Array} The full tree with child clauses.
	 */
	Clause.prototype.tree = function() {
		var tree = [],
			i;
		
		for (i = 0; i < this._tree.length; i += 1) {
			if (this._tree[i] instanceof Clause) {
				tree = tree.concat(this._tree[i].tree());
			}
			else {
				tree.push(this._tree[i]);
			}
		}
		
		return tree;
	};
	
	/**
	 * Creates a string representation.
	 * 
	 * @returns {String}
	 */
	Clause.prototype.toString = function() {
		var tree = this.tree(),
			str = '',
			i;
		
		for (i = 0; i < tree.length; i += 1) {
			str += tree[i].toString();
		}
		
		return str;
	};
	
	// TODO: Create a 'Source' clause.
	// TODO: Create a 'Table' source.
	// TODO: Create a 'Select' source.
	
	/**
	 * Creates a new SQL expression clause.
	 * 
	 * @constructor
	 */
	function Expr() {
		this._tree = [];
	};
	
	Expr.prototype = new Clause();
	
	/**
	 * Adds a literal value to the expression tree. This does not directly add the value, but adds
	 * {Param} to the tree that is later bound to the value just before execution. This
	 * avoids problems with SQL injection attacks and other bad things.
	 * 
	 * @param {Object} value - A literal value.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.literal = function(value) {
		
		if (value === SQL.LITERAL_VALUE.NULL) {
			this._tree.push(SQL.LITERAL_VALUE.NULL);
		} else if (value === SQL.LITERAL_VALUE.CURRENT_TIME) {
			this._tree.push(SQL.LITERAL_VALUE.CURRENT_TIME);
		}
		else if (value === SQL.LITERAL_VALUE.CURRENT_DATE) {
			this._tree.push(SQL.LITERAL_VALUE.CURRENT_DATE);
		}
		else if (value === SQL.LITERAL_VALUE.CURRENT_TIMESTAMP) {
			this._tree.push(SQL.LITERAL_VALUE.CURRENT_TIMESTAMP);
		} else {
			this._tree.push(new Param(value));	
		}
		
		return this;
	};
	
	/**
	 * Adds a column name to the expression tree.
	 * 
	 * @param {String} columnName - A column name.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.column = function(columnName) {
		this._tree.push(columnName);
		
		return this;
	};
	
	/**
	 * Adds the 'NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [operand] - The operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.not = function(operand) {
		return this._binaryOperator(SQL.OPERATORS.NOT, operand);
	};
	
	/**
	 * Begins a grouping. 
	 * 
	 * This adds a '(' onto the expression tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.begin = function() {
		this._tree.push("(");
		
		return this;
	};
	
	/**
	 * Ends a grouping.
	 * 
	 * This adds a ')' onto the expression tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.end = function() {
		this._tree.push(")");
		
		return this;
	};
	
	/**
	 * Adds a binary operator and its right operand to the tree. The left operand
	 * is assumed to already be attached to the tree.
	 * 
	 * @param {OPERATORS} operator - The operator.
	 * @param {Expr|String|Number} rightOperant - The right operand
	 * @return {Expr} This SQL expression clause.  
	 */
	Expr.prototype._binaryOperator = function(operator, rightOperand) {
		this._tree.push(" " + operator + " ");
		
		if (rightOperand !== undefined) {
			if (rightOperand instanceof Expr) {
				this._tree.push(rightOperand);
			} else {
				this._tree.push(new Param(rightOperand));
			}
		}
		
		return this;
	};
	
	/**
	 * Adds the '||' concatenate operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.concat = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.CONCAT, rightOperand);
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.multiply = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.MULTIPLY, rightOperand);
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.times = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.MULTIPLY, rightOperand);
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.divide = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.DIVIDE, rightOperand);
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.dividedBy = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.DIVIDE, rightOperand);
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.modulo = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.MODULO, rightOperand);
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.remainder = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.MODULO, rightOperand);
	};
	
	/**
	 * Adds the '+' add operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.add = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.ADD, rightOperand);
	};
	
	/**
	 * Adds the '-' subtract operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.subtract = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.SUBTRACT, rightOperand);
	};
	
	/**
	 * Adds the '<' less than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.lessThan = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.LESS_THAN, rightOperand);
	};
	
	/**
	 * Adds the '<=' less than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.lessThanEquals = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.LESS_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '>' greater than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.greaterThan = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.GREATER_THAN, rightOperand);
	};
	
	/**
	 * Adds the '>=' greater than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.greaterThanEquals = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.GREATER_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '=' or '==' equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.equals = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '!=' not equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.notEquals = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.NOT_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the 'AND' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.and = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.AND, rightOperand);
	};
	
	/**
	 * Adds the 'OR' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.or = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.OR, rightOperand);
	};
	
	/**
	 * Adds the 'CAST' function to the expression tree.
	 * 
	 * @param {Expr|String|Number} expr - The object to cast.
	 * @param {TypeConstant} toType - The type to convert or cast the expr to.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.cast = function(expr, toType) {
		this._tree.push(" CAST ");
		this.begin();
		this._tree.push(expr);
		this._tree.push(" AS ");
		this._tree.push(toType.dbType);
		this.end();
		
		return this;
	};
	
	/**
	 * Adds the 'COLLATE' function to the expression tree.
	 * 
	 * @param {Expr|String|Number} expr - The object to collate.
	 * @param {CollateConstant} collation - The collation.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.collate = function(expr, collation) {
		this._tree.push(expr);
		this._tree.push(collation);
		
		return this;
	};
	
	/**
	 * Adds the 'LIKE' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.like = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.LIKE, rightOperand);
	};
	
	/**
	 * Adds the 'GLOB' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.glob = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.GLOB, rightOperand);
	};
		
	/**
	 * Adds the 'REGEXP' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.regexp = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.REGEXP, rightOperand);
	};
	
	/**
	 * Adds the 'MATCH' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.match = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.MATCH, rightOperand);
	};
	
	/**
	 * Adds the 'IS' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.is = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.IS, rightOperand);
	};
	
	/**
	 * Adds the 'IS NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.isNot = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.IS_NOT, rightOperand);
	};
	
	/**
	 * Adds the 'IN' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.in_ = function(rightOperand) {
		return this._binaryOperator(SQL.OPERATORS.IN, rightOperand);
	};
	
	/**
	 * Adds the 'ISNULL' operation to the expression tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.isNull = function() {
		this._tree.push(" ISNULL");
		
		return this;
	};
	
	/**
	 * Adds the 'NOTNULL' operation to the expression tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.notNull = function() {
		this._tree.push(" NOTNULL");
		
		return this;
	};
		
	/**
	 * Adds the 'ESCAPE' operation to the expression tree.
	 * 
	 * @param {Expr} expr - The escape expression.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.escape = function(expr) {
		this._tree.push(" ESCAPE ");
		this._tree.push(expr);
		
		return this;
	};
	
	/**
	 * Adds the 'BETWEEN' clause to the expression tree.
	 * 
	 * @param {Expr|String|Number} leftOperand - The left operand.
	 * @param {Expr|String|Number} rightOperand - The right operand.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.between = function(leftOperand, rightOperand) {
		this._tree.push(" BETWEEN ");
		this._tree.push(leftOperand);
		this._tree.push(" AND ");
		this._tree.push(rightOperand);
		
		return this;
	};
	
	/**
	 * Adds the 'EXISTS' clause to the expression tree.
	 * 
	 * @param {Clause} select - A select clause.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.exists = function(select) {
		this._tree.push(" EXISTS ");
		this.begin();
		this._tree.push(select);
		this.end();
		
		return this;
	};
	
	/**
	 * Adds the 'CASE' clause to the expression tree.
	 * 
	 * @param {Expr} expr - The expression.
	 * @param {Expr} whenExpr - The when expression.
	 * @param {Expr} thenExpr - The then expression.
	 * @param {Expr} elseExpr - The else expression.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.case_ = function(expr, whenExpr, thenExpr, elseExpr) {
		this._tree.push(" CASE ");
		this._tree.push(expr);
		this._tree.push(" WHEN ");
		this._tree.push(whenExpr);
		this._tree.push(" THEN ");
		this._tree.push(thenExpr);
		this._tree.push(" ELSE ");
		this._tree.push(elseExpr);
		this._tree.push(" END");
		
		return this;
	}; 
	
	/**
	 * Adds the 'raise-function' clause to the expression tree.
	 * 
	 * @param {RaiseFunctionsConstant} func - The raise function.
	 * @param {String} errorMessage - The error message.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.raise = function(func, errorMessage) {
		this._tree.push(" RAISE ");
		this.begin();
		this._tree.push(func);
		
		if (func !== SQL.RAISE_FUNCTIONS.IGNORE) {
			this._tree.push(", ");
			this._tree.push(errorMessage);
		}
		
		this.end();
		
		return this;
	};
	
	/**
	 * Adds an expression to this expression.
	 * 
	 * @param {Expr} expr - An SQL expression clause.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.expr = function(expr) {
		this._tree.push(expr);
		
		return this;
	};
	
	/**
	 * Creates a new SQL 'INSERT' statement.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The table name.
	 */
	function Insert(tableName) {
		this._tree = [];
		this._tree.push("INSERT INTO ");
		this._tree.push(tableName);
		this._tree.push(" ");
	};
	
	Insert.prototype = new Clause();
	
	function Columns(names) {
		this._tree = [];
		this._tree.push("(");
		
		var stopCount = names.length - 1,
			i;
		
		for (i = 0; i < stopCount; i += 1) {
			this._tree.push(names[i]);
			this._tree.push(", ");
		}
		
		this._tree.push(names[i]);
		this._tree.push(")");
	};
	
	Columns.prototype = new Clause();
	
	/**
	 * Adds the 'column-name' clause to this 'INSERT' SQL statement.
	 * 
	 * @param {Array} names - The column names as {String}.
	 * @returns {Insert} This 'INSERT' SQL statement.
	 */
	Insert.prototype.columns = function(names) {
		this._tree.push(new Columns(names));
		
		return this;
	};
	
	function Values(values) {
		this._tree = [];
		this._tree.push(" VALUES (");
		
		var count = values.length - 1,
			i;
		
		for (i = 0; i < count; i += 1) {
			this._tree = this._tree.concat(_getValueTree(values[i]));
			this._tree.push(", ");
		}
		
		this._tree = this._tree.concat(_getValueTree(values[i]));
		this._tree.push(")");
	};
	
	Values.prototype = new Clause();
	
	function _getValueTree(value) {
		var keys,
			key,
			tree = [];
		
		if (typeof value === 'object') {
			keys = Object.keys(value);
			key = keys[0];
			
			tree.push(new Param(value[key], key));	
		} else {
			tree.push(new Param(value));
		}
		
		return tree;
	}
	
	/**
	 * Adds the 'VALUES' clause to this 'INSERT' SQL statement.
	 * 
	 * @param {Array} values - The elements are either a {String} or an {Object}. An {Object} will have one property where the key will be used as the named parameter.
	 * @returns {Insert} This SQL statement.
	 */
	Insert.prototype.values = function(values) {
		this._tree.push(new Values(values));
		
		return this;
	};
	
	function Set(columns) {
		this._tree = [];
		this._tree.push("SET ");
		
		var count = columns.length - 1,
			i;
		
		for (i = 0; i < count; i += 1) {
			this._tree = this._tree.concat(_set(columns[i]));
			this._tree.push(", ");
		}
		
		this._tree = this._tree.concat(_set(columns[i]));

	}
	
	Set.prototype = new Clause();
	
	function _set(column) {
		var keys,
			key,
			tree = [];
	
		keys = Object.keys(column);
		key = keys[0];
		
		tree.push(key);
		tree.push(" = ");
		tree.push(new Param(column[key]));
		
		return tree;
	}
	
	function Where(expr) {
		this._tree = [];
		this._tree.push(" WHERE ");
		this._tree.push(expr);
	};
	
	Where.prototype = new Clause();
	
	/**
	 * Creates a new SQL 'UPDATE' statement.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The name of a table to update.
	 */
	function Update(tableName) {
		this._tree = [];
		this._tree.push("UPDATE ");
		this._tree.push(tableName);
		this._tree.push(" ");
	};
	
	Update.prototype = new Clause();
	
	/**
	 * Adds the 'SET' clauses to this 'UPDATE' SQL clause.
	 * 
	 * The column names will be used as the named bind parameters.
	 * 
	 * @param {Array} columns - An object literal with the keys as the column names and the values as the values to update. 
	 * @returns {Update} This SQL clause.
	 */
	Update.prototype.set = function(columns) {
		this._tree.push(new Set(columns));
		
		return this;
	};
	
	Update.prototype.where = function(expr) {
		this._tree.push(new Where(expr));
		
		return this;
	};
	
	/**
	 * Creates a new SQL 'DELETE' statement.
	 * 
	 * @constructor
	 */
	function Delete(tableName) {
		this._tree = [];
		this._tree.push("DELETE FROM ");
		this._tree.push(tableName);
	};
	
	Delete.prototype = new Clause();
	
	Delete.prototype.where = function(expr) {
		this._tree.push(new Where(expr));
		
		return this;
	};
	
	// TODO: Implement 'ORDER BY' for 'DELETE' statement.
	// TODO: Implement 'LIMIT' and 'OFFSET' for 'DELETE' statement.	
	
	function From(source) {
		this._tree = [];
		this._tree.push(" FROM ");
		this._tree.push(source);
	};
	
	From.prototype = new Clause();
	
	function Join(source) {
		this._tree = [];
		this._tree.push(" JOIN ");
		this._tree = this._tree.concat(_getPossibleAliasedTree(source));
	};
	
	Join.prototype = new Clause();
	
	function LeftJoin(source) {
		this._tree = [];
		this._tree.push(" LEFT JOIN ");
		this._tree = this._tree.concat(_getPossibleAliasedTree(source));
	}
	
	LeftJoin.prototype = new Clause();
	
	function LeftOuterJoin(source) {
		this._tree = [];
		this._tree.push(" LEFT OUTER JOIN ");
		this._tree = this._tree.concat(_getPossibleAliasedTree(source));
	}
	
	LeftOuterJoin.prototype = new Clause();
	
	function InnerJoin(source) {
		this._tree = [];
		this._tree.push(" INNER JOIN ");
		this._tree = this._tree.concat(_getPossibleAliasedTree(source));
	}
	
	InnerJoin.prototype = new Clause();
	
	function CrossJoin(source) {
		this._tree = [];
		this._tree.push(" CROSS JOIN ");
		this._tree = this._tree.concat(_getPossibleAliasedTree(source));
	}
	
	CrossJoin.prototype = new Clause();
	
	function On(expr) {
		this._tree = [];
		this._tree.push(" ON ");
		this._tree.push(expr);
	};
	
	On.prototype = new Clause();
	
	/**
	 * Creates a new SQL 'SELECT' statement.
	 * 
	 * @constructor
	 * 
	 * @param {Array} resultColumns - An array of strings and/or object literals with the keys as the alias for column names.
	 */
	function Select(resultColumns) {
		this._tree = [];
		this._tree.push("SELECT ");
		
		var count,
			i;
		
		if (typeof resultColumns === 'undefined') {
			this._tree.push("*");
		} else {
			count = resultColumns.length - 1;
			
			for (i = 0; i < count; i += 1) {
				this._tree = this._tree.concat(_getPossibleAliasedTree(resultColumns[i]));
				this._tree.push(", ");
			}
			
			this._tree = this._tree.concat(_getPossibleAliasedTree(resultColumns[i]));	
		}
	};
	
	Select.prototype = new Clause();
	
	// TODO: Implement 'Table' clause.
	// TODO: Implement alternative sources for the 'FROM' clause instead of just a string for the table name. This means other select statments, which should be wrapped in paranthesis and aliasable.
	
	/**
	 * Adds the 'FROM' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.from = function(tableName) {
		this._tree.push(new From(tableName));
		
		return this;
	};
	
	/**
	 * Adds the 'JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.join = function(tableName) {
		this._tree.push(new Join(tableName));
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.leftJoin = function(tableName) {
		this._tree.push(new LeftJoin(tableName));
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT OUTER JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.leftOuterJoin = function(tableName) {
		this._tree.push(new LeftOuterJoin(tableName));
		
		return this;
	};
	
	/**
	 * Adds the 'INNER JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.innerJoin = function(tableName) {
		this._tree.push(new InnerJoin(tableName));
		
		return this;
	};
	
	/**
	 * Adds the 'CROSS JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.crossJoin = function(tableName) {
		this._tree.push(new CrossJoin(tableName));
		
		return this;
	};
	
	/**
	 * Adds the 'ON' clause to the expression tree.
	 * 
	 * @param {Expr} expr - The SQL expression.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.on = function(expr) {
		this._tree.push(new On(expr));
		
		return this;
	};
	
	Select.prototype.where = function(expr) {
		this._tree.push(new Where(expr));
		
		return this;
	};
	
	// TODO: Implement more flexible join construction mechanism.
	// TODO: Create sub-prototypes for all clauses, such as a 'WHERE' clause prototype, a 'FROM' clause prototype, etc. and the functions from the statements are wrappers for creating these clauses.
	// TODO: Implement "GROUP BY" construction.
	// TODO: Add 'ORDER BY' construction.
	// TODO: Add 'LIMIT' construction.
	
	/**
	 * Factory method for creating expressions.
	 * 
	 * @returns {Expr} A new Expr object.
	 */
	SQL.expr = function() {
		return new Expr();
	};
	
	/**
	 * Factory method for creating a 'INSERT' statement.
	 * 
	 * @returns {Insert} A new 'INSERT' statement.
	 */
	SQL.insert = function(tableName) {
		return new Insert(tableName);
	};
	
	SQL.columns = function(columnNames) {
		return new Columns(columnNames);
	};
	
	SQL.values = function(values) {
		return new Values(values);
	};
	
	SQL.set = function(columns) {
		return new Set(columns);
	};
	
	SQL.where = function(expr) {
		return new Where(expr);
	};
		
	/**
	 * Factory method for creating an 'UPDATE' statement.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Update} A new 'UPDATE' statement.
	 */
	SQL.update = function(tableName) {
		return new Update(tableName);
	};
	
	/**
	 * Factory method for creating a 'DELETE' statement.
	 * 
	 * @returns {Delete} A new 'DELETE' statement.
	 */
	SQL.remove = function(tableName) {
		return new Delete(tableName);
	};
	
	SQL.from = function(source) {
		return new From(source);
	};
	
	SQL.join = function(source) {
		return new Join(source);
	};
	
	SQL.leftJoin = function(source) {
		return new LeftJoin(source);
	};
	
	SQL.leftOuterJoin = function(source) {
		return new LeftOuterJoin(source);
	};
	
	SQL.innerJoin = function(source) {
		return new InnerJoin(source);
	};
	
	SQL.crossJoin = function(source) {
		return new CrossJoin(source);
	};
	
	SQL.on = function(expr) {
		return new On(expr);
	};
	
	/**
	 * Factory method for creating a 'SELECT' statement.
	 * 
	 * @param {Array} resultColumns - An array of strings and/or object literals with the keys as the alias for column names.
	 * @returns {Select} A new 'SELECT' statement.
	 */
	SQL.select = function(resultColumns) {
		return new Select(resultColumns);
	};
}());