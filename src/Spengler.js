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
var EXPORTED_SYMBOLS = ["Spengler"];

/**
 * @namespace
 */
var Spengler = {};

(function() {
	/**
	 * The possible values for the 'collate' option.
	 * 
	 * @typedef {String} CollateConstant
	 * @readonly
	 * @constant
	 */
	Spengler.COLLATE = {
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
	Spengler.OPERATORS = {
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
	Spengler.LITERAL_VALUES = {
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
	Spengler.RAISE_FUNCTIONS = {
		IGNORE: 'IGNORE',
		ROLLBACK: 'ROLLBACK',
		ABORT: 'ABORT',
		FAIL: 'FAIL',
	};
	
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
	 * Creates a new SQL compiled statement.
	 * 
	 * @constructor
	 * 
	 * @param {String} sql - The SQL string compiled from a clause.
	 * @param {Object} params - A literal with the properties as the keys for the named bind parameters and the property values as the binding values.
	 */
	function Compiled(sql, params) {
		this._sql = sql;
		this.params = params;
	};
	
	/**
	 * The SQL string ready for parameter binding and execution.
	 * 
	 * @return {String} The SQL string.
	 */
	Compiled.prototype.toString = function() {
		return this._sql;
	};
	
	
	/**
	 * Creates a new SQL clause.
	 * 
	 * @constructor
	 */
	function Clause() {
		// TODO: Add '_parent' attribute.
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
		var str = '',
			i;
		
		for (i = 0; i < this._tree.length; i += 1) {
			str += this._tree[i].toString();
		}
		
		return str;
	};
	
	/**
	 * Creates a new SQL statement.
	 * 
	 * @constructor.
	 */
	function Statement() {
		this._tree = [];
	};
	
	Statement.prototype = new Clause();
	
	/**
	 * Compiles the clause ready for parameter binding and execution.
	 * 
	 * @returns {Compiled} A compiled object that contains the SQL string and the parameters for binding.
	 */
	Statement.prototype.compile = function() {
		var sql = '',
			tree = this.tree(),
			params = {},
			paramCount = 0,
			node,
			i;
		
		for (i = 0; i < tree.length; i += 1) {
			node = tree[i];
			if (node instanceof Param) {
				if (!node.key) {
					node.key = _generateParamKey(paramCount);
					paramCount += 1;
				}
				
				sql += ":" + node.key;
				params[node.key] = node.value;
			} else {
				sql += node;
			}
		}
		
		return new Compiled(sql, params);
	};
	
	/**
	 * Generates a named parameter key based on the current number of parameters.
	 * 
	 * A named parameter is created using the following pattern: 'paramA', 'paramB', 
	 * 'paramC', ... 'paramAA', 'paramBB', ... 'paramAAA' and so on.
	 * 
	 * @param {Integer} paramCount - The current number of parameters.
	 */
	function _generateParamKey(paramCount) {
		var DEFAULT_PARAM = "param",
			charCode = 65 + (paramCount % 26),
			repeat = paramCount / 26,
			suffix,
			i;
		
		suffix = String.fromCharCode(charCode);
		
		for (i = 1; i < repeat; i += 1) {
			suffix = String.fromCharCode(charCode);
		}
		
		return DEFAULT_PARAM + suffix;
	}
	
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
		
		if (value === Spengler.LITERAL_VALUE.NULL) {
			this._tree.push(Spengler.LITERAL_VALUE.NULL);
		} else if (value === Spengler.LITERAL_VALUE.CURRENT_TIME) {
			this._tree.push(Spengler.LITERAL_VALUE.CURRENT_TIME);
		}
		else if (value === Spengler.LITERAL_VALUE.CURRENT_DATE) {
			this._tree.push(Spengler.LITERAL_VALUE.CURRENT_DATE);
		}
		else if (value === Spengler.LITERAL_VALUE.CURRENT_TIMESTAMP) {
			this._tree.push(Spengler.LITERAL_VALUE.CURRENT_TIMESTAMP);
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
		return this._binaryOperator(Spengler.OPERATORS.NOT, operand);
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
		return this._binaryOperator(Spengler.OPERATORS.CONCAT, rightOperand);
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.multiply = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.MULTIPLY, rightOperand);
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.times = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.MULTIPLY, rightOperand);
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.divide = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.DIVIDE, rightOperand);
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.dividedBy = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.DIVIDE, rightOperand);
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.modulo = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.MODULO, rightOperand);
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.remainder = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.MODULO, rightOperand);
	};
	
	/**
	 * Adds the '+' add operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.add = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.ADD, rightOperand);
	};
	
	/**
	 * Adds the '-' subtract operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.subtract = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.SUBTRACT, rightOperand);
	};
	
	/**
	 * Adds the '<' less than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.lessThan = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.LESS_THAN, rightOperand);
	};
	
	/**
	 * Adds the '<=' less than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.lessThanEquals = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.LESS_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '>' greater than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.greaterThan = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.GREATER_THAN, rightOperand);
	};
	
	/**
	 * Adds the '>=' greater than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.greaterThanEquals = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.GREATER_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '=' or '==' equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.equals = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '!=' not equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.notEquals = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.NOT_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the 'AND' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.and = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.AND, rightOperand);
	};
	
	/**
	 * Adds the 'OR' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.or = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.OR, rightOperand);
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
		return this._binaryOperator(Spengler.OPERATORS.LIKE, rightOperand);
	};
	
	/**
	 * Adds the 'GLOB' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.glob = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.GLOB, rightOperand);
	};
		
	/**
	 * Adds the 'REGEXP' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.regexp = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.REGEXP, rightOperand);
	};
	
	/**
	 * Adds the 'MATCH' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.match = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.MATCH, rightOperand);
	};
	
	/**
	 * Adds the 'ESCAPE' clause to the expression tree.
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
	 * Adds the 'ISNULL' cluase to the expression tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.isNull = function() {
		this._tree.push(" ISNULL");
		
		return this;
	};
	
	/**
	 * Adds the 'NOTNULL' cluase to the expression tree.
	 * 
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.notNull = function() {
		this._tree.push(" NOTNULL");
		
		return this;
	};
	
	/**
	 * Adds the 'IS' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.is = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.IS, rightOperand);
	};
	
	/**
	 * Adds the 'IS NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.isNot = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.IS_NOT, rightOperand);
	};
	
	/**
	 * Adds the 'IN' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This SQL expression clause.
	 */
	Expr.prototype.in_ = function(rightOperand) {
		return this._binaryOperator(Spengler.OPERATORS.IN, rightOperand);
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
		
		if (func !== Spengler.RAISE_FUNCTIONS.IGNORE) {
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
	 * Creates a new 'Whereable' object.
	 * 
	 * A 'Whereable' object is any SQL statement that can have a 'WHERE' clause.
	 * 
	 * @constructor
	 */
	function Whereable() {
		this._tree = [];
	};
	
	Whereable.prototype = new Statement();
	
	/**
	 * Adds a 'WHERE' clause to this SQL clause.
	 * 
	 * @param {Expr} expr - A SQL expression clause.
	 * @returns {Clause} This SQL clause.
	 */
	Whereable.prototype.where = function(expr) {
		this._tree.push(" WHERE ");
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
	};
	
	Insert.prototype = new Statement();
	
	/**
	 * Adds the 'column-name' clause to this 'INSERT' SQL statement.
	 * 
	 * @param {Array} columnNames - The column names as {String}.
	 * @returns {Insert} This 'INSERT' SQL statement.
	 */
	Insert.prototype.columns = function(columnNames) {
		var stopCount = columnNames.length - 1,
			i;
		
		this._tree.push(" (");
				
		for (i = 0; i < stopCount; i += 1) {
			this._tree.push(columnNames[i]);
			this._tree.push(", ");
		}
		
		this._tree.push(columnNames[i]);
		this._tree.push(")");
		
		return this;
	};
	
	/**
	 * Adds the 'VALUES' clause to this 'INSERT' SQL statement.
	 * 
	 * The keys in the {Object} literal will be used as the named bind-parameters. 
	 * 
	 * @param {Object} values - An object literal with the keys as the property names for the columns in the table. Value of the property in the object literal is the value to insert in the table for the column.
	 * @returns {Insert} This SQL statement.
	 */
	Insert.prototype.values = function(values) {
		var key,
			keys,
			count,
			i;
		
		this._tree.push(" VALUES (");
		
		keys = Object.keys(values);
		count = keys.length - 1;
			
		for (i = 0; i < count; i += 1) {
			key = keys[i];
			this._tree.push(new Param(values[key], key));
			this._tree.push(", ");
		}
			
		key = keys[i];
		this._tree.push(new Param(values[key], key));
		this._tree.push(")");
		
		return this;
	};
	
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
	};
	
	Update.prototype = new Whereable();
	
	/**
	 * Adds the 'SET' clauses to this 'UPDATE' SQL clause.
	 * 
	 * The column names will be used as the named bind parameters.
	 * 
	 * @param {Object} columns - An object literal with the keys as the column names and the values as the values to update. 
	 * @returns {Update} This SQL clause.
	 */
	Update.prototype.set = function(columns) {
		var keys = Object.keys(columns),
			count = keys.length - 1,
			columnName,
			i;
		
		this._tree.push(" SET ");
		
		for (i = 0; i < count; i += 1) {
			columnName = keys[i];
			this._tree.push(columnName);
			this._tree.push(" = ");
			this._tree.push(new Param(columns[columnName], columnName));
			this._tree.push(", ");
		}
		
		columnName = keys[i];
		this._tree.push(columnName);
		this._tree.push(" = ");
		this._tree.push(new Param(columns[columnName], columnName));
		
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
	
	// TODO: Implement 'ORDER BY' for 'DELETE' statement.
	// TODO: Implement 'LIMIT' and 'OFFSET' for 'DELETE' statement.	
	
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
		
		var count = resultColumns.length - 1,
			i;
		
		if (count < 0) {
			this._tree.push("*");
		} else {
			for (i = 0; i < count; i += 1) {
				this._add(resultColumns[i]);
				this._tree.push(", ");
			}
			
			this._add(resultColumns[i]);	
		}
	};
	
	Select.prototype = new Whereable();
	
	/**
	 * Adds a value to the expression tree. If the value is an object with a single
	 * key, then the key is used as an alias for the SQL source.
	 * 
	 * @param {Object|String} value - The value to add to the expression tree. Use an object literal with the key as the alias to implement an alias for SQL value.
	 */
	Select.prototype._add = function(value) {
		var keys,
			key;
	
		if (typeof value === 'object') {
			keys = Object.keys(value);
			key = keys[0];
			this._tree.push(value[key]);
			this._tree.push(" AS ");
			this._tree.push(key);
		} else {
			this._tree.push(alias);
		}
	};
	
	/**
	 * Adds the 'FROM' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.from = function(tableName) {
		this._tree.push(" FROM ");
		this._alias(tableName);
		
		return this;
	};
	
	/**
	 * Adds the 'JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.join = function(tableName) {
		this._tree.push(" JOIN ");
		this._add(tableName);
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.leftJoin = function(tableName) {
		this._tree.push(" LEFT");
		
		return this.join(tableName);
	};
	
	/**
	 * Adds the 'LEFT OUTER JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.leftOuterJoin = function(tableName) {
		this._tree.push(" LEFT");
		this._tree.push(" OUTER");
		
		return this.join(tableName);
	};
	
	/**
	 * Adds the 'INNER JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.innerJoin = function(tableName) {
		this._tree.push(" INNER");
		
		return this.join(tableName);
	};
	
	/**
	 * Adds the 'CROSS JOIN' clause to the expression tree.
	 * 
	 * @param {Object|String} tableName - The table name. Use an object literal with the key as the alias to implement an SQL alias.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.crossJoin = function(tableName) {
		this._tree.push(" CROSS");
		
		return this.join(tableName);
	};
	
	/**
	 * Adds the 'ON' clause to the expression tree.
	 * 
	 * @param {Expr} expr - The SQL expression.
	 * @returns {Select} This SQL clause.
	 */
	Select.prototype.on = function(expr) {
		this._tree.push(" ON ");
		this._tree.push(expr);
		
		return this;
	};
	
	// TODO: Implement 'select-stmt' for tableName value in 'from' function.
	// TODO: Implement more flexible join construction mechanism.
	// TODO: Implement "GROUP BY" construction.
	// TODO: Add 'ORDER BY' construction.
	// TODO: Add 'LIMIT' construction.
	
	/**
	 * Factory method for creating expressions.
	 * 
	 * @returns {Expr} A new Expr object.
	 */
	Spengler.expr = function() {
		return new Expr();
	};
	
	/**
	 * Factory method for creating a 'INSERT' statement.
	 * 
	 * @returns {Insert} A new 'INSERT' statement.
	 */
	Spengler.insert = function(tableName) {
		return new Insert(tableName);
	};
	
	/**
	 * Factory method for creating an 'UPDATE' statement.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Update} A new 'UPDATE' statement.
	 */
	Spengler.update = function(tableName) {
		return new Update(tableName);
	};
	
	/**
	 * Factory method for creating a 'DELETE' statement.
	 * 
	 * @returns {Delete} A new 'DELETE' statement.
	 */
	Spengler.remove = function(tableName) {
		return new Delete(tableName);
	};
	
	/**
	 * Factory method for creating a 'SELECT' statement.
	 * 
	 * @param {Array} resultColumns - An array of strings and/or object literals with the keys as the alias for column names.
	 * @returns {Select} A new 'SELECT' statement.
	 */
	Spengler.select = function(resultColumns) {
		return new Select(resultColumns);
	};
}());