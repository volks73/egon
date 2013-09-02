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
 * The Original Code is Ramis.
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
var EXPORTED_SYMBOLS = ["Ramis"];

/**
 * @namespace
 */
var Ramis = {};

(function() {
	/**
	 * The possible values for the 'collate' option.
	 * 
	 * @typedef {String} CollateConstant
	 * @readonly
	 * @constant
	 */
	Ramis.COLLATE = {
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
	Ramis.OPERATORS = {
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
	Ramis.LITERAL_VALUES = {
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
	Ramis.RAISE_FUNCTIONS = {
		IGNORE: 'IGNORE',
		ROLLBACK: 'ROLLBACK',
		ABORT: 'ABORT',
		FAIL: 'FAIL',
	}; 
	
	// TODO: List constructors alphebtically.
	
	/**
	 * Creates a new bind parameter object.
	 * 
	 * A bind parameter has a key, or placeholder, and a value. The value replaces the placeholder 
	 * when binding the parameters to a SQL statement. This prevents SQL injection attacks because
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
	 * Creates a new clause.
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
	 * Gets the previous node in the tree.
	 * 
	 * @returns {Clause|String} The previous node.
	 */
	Clause.prototype.previous = function() {
		return this._tree[this._tree.length - 1];
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
	 * avoids problems with Ramis injection attacks and other bad things.
	 * 
	 * @param {Object} value - A literal value.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.literal = function(value) {
		
		if (value === Ramis.LITERAL_VALUE.NULL) {
			this._tree.push(Ramis.LITERAL_VALUE.NULL);
		} else if (value === Ramis.LITERAL_VALUE.CURRENT_TIME) {
			this._tree.push(Ramis.LITERAL_VALUE.CURRENT_TIME);
		}
		else if (value === Ramis.LITERAL_VALUE.CURRENT_DATE) {
			this._tree.push(Ramis.LITERAL_VALUE.CURRENT_DATE);
		}
		else if (value === Ramis.LITERAL_VALUE.CURRENT_TIMESTAMP) {
			this._tree.push(Ramis.LITERAL_VALUE.CURRENT_TIMESTAMP);
		} else {
			this._tree.push(new Param(value));	
		}
		
		return this;
	};
	
	/**
	 * Adds a column name to the expression tree.
	 * 
	 * @param {String} columnName - A column name.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.column = function(columnName) {
		this._tree.push(columnName);
		
		return this;
	};
	
	/**
	 * Adds the 'NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [operand] - The operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.not = function(operand) {
		return this._binaryOperator(Ramis.OPERATORS.NOT, operand);
	};
	
	/**
	 * Begins a grouping. 
	 * 
	 * This adds a '(' onto the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
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
	 * @return {Expr} This Ramis expression clause.  
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
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.concat = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.CONCAT, rightOperand);
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.multiply = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.MULTIPLY, rightOperand);
	};
	
	/**
	 * Adds the '*' multiply operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.times = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.MULTIPLY, rightOperand);
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.divide = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.DIVIDE, rightOperand);
	};
	
	/**
	 * Adds the '/' divide operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.dividedBy = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.DIVIDE, rightOperand);
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.modulo = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.MODULO, rightOperand);
	};
	
	/**
	 * Adds the '%' modulo operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.remainder = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.MODULO, rightOperand);
	};
	
	/**
	 * Adds the '+' add operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.add = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.ADD, rightOperand);
	};
	
	/**
	 * Adds the '-' subtract operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.subtract = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.SUBTRACT, rightOperand);
	};
	
	/**
	 * Adds the '<' less than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.lessThan = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.LESS_THAN, rightOperand);
	};
	
	/**
	 * Adds the '<=' less than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.lessThanEquals = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.LESS_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '>' greater than operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.greaterThan = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.GREATER_THAN, rightOperand);
	};
	
	/**
	 * Adds the '>=' greater than equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.greaterThanEquals = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.GREATER_THAN_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '=' or '==' equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} rightOperand - The right operand to the binary operator. 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.equals = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.EQUALS, rightOperand);
	};
	
	/**
	 * Adds the '!=' not equals operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.notEquals = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.NOT_EQUALS, rightOperand);
	};
	
	/**
	 * Adds the 'AND' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.and = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.AND, rightOperand);
	};
	
	/**
	 * Adds the 'OR' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.or = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.OR, rightOperand);
	};
	
	/**
	 * Adds the 'CAST' function to the expression tree.
	 * 
	 * @param {Expr|String|Number} expr - The object to cast.
	 * @param {TypeConstant} toType - The type to convert or cast the expr to.
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.like = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.LIKE, rightOperand);
	};
	
	/**
	 * Adds the 'GLOB' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.glob = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.GLOB, rightOperand);
	};
		
	/**
	 * Adds the 'REGEXP' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.regexp = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.REGEXP, rightOperand);
	};
	
	/**
	 * Adds the 'MATCH' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.match = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.MATCH, rightOperand);
	};
	
	/**
	 * Adds the 'IS' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.is = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.IS, rightOperand);
	};
	
	/**
	 * Adds the 'IS NOT' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.isNot = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.IS_NOT, rightOperand);
	};
	
	/**
	 * Adds the 'IN' operator to the expression tree.
	 * 
	 * @param {Expr|String|Number} [rightOperand] - The right operand to the binary operator.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.in_ = function(rightOperand) {
		return this._binaryOperator(Ramis.OPERATORS.IN, rightOperand);
	};
	
	/**
	 * Adds the 'ISNULL' operation to the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.isNull = function() {
		this._tree.push(" ISNULL");
		
		return this;
	};
	
	/**
	 * Adds the 'NOTNULL' operation to the expression tree.
	 * 
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.notNull = function() {
		this._tree.push(" NOTNULL");
		
		return this;
	};
		
	/**
	 * Adds the 'ESCAPE' operation to the expression tree.
	 * 
	 * @param {Expr} expr - The escape expression.
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
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
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.raise = function(func, errorMessage) {
		this._tree.push(" RAISE ");
		this.begin();
		this._tree.push(func);
		
		if (func !== Ramis.RAISE_FUNCTIONS.IGNORE) {
			this._tree.push(", ");
			this._tree.push(errorMessage);
		}
		
		this.end();
		
		return this;
	};
	
	/**
	 * Adds an expression to this expression clause.
	 * 
	 * @param {Expr} expr - An Ramis expression clause.
	 * @returns {Expr} This Ramis expression clause.
	 */
	Expr.prototype.expr = function(expr) {
		this._tree.push(expr);
		
		return this;
	};
	
	// TODO: Implement 'ORDER BY' for 'DELETE' statement.
	// TODO: Implement 'LIMIT' and 'OFFSET' for 'DELETE' statement.	
	
	/**
	 * Creates a new 'FROM source' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|Source} source - If {String}, then the source is assumed to be a table name and a {TableSource} is created automatically and added to the clause tree.
	 */
	function From(source) {
		this._tree = [];
		this._tree.push(" FROM ");
		
		if (typeof source === 'string') {
			this._tree.push(new TableSource(source));
		} else if (source instanceof Source) {
			this._tree.push(source);
		} else {
			// TODO: Throw custom IllegalArgument exception.
		}
	};
	
	From.prototype = new Clause();
	
	/**
	 * Creates a new 'AS alias' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} alias - The alias for the previous value in the clause tree.
	 */
	function As(alias) {
		this._tree = [];
		this._tree.push(" AS ");
		this._tree.push(alias);
	};
	
	As.prototype = new Clause();
	
	/**
	 * Creates a new source clause.
	 * 
	 * @constructor
	 * 
	 * @param {Source} [source] - A join source.
	 * @param {Join} [join] - A join clause.
	 */
	function Source(source, join) {
		this._tree = [];
		
		if (typeof source !== 'undefined') {
			if (source instanceof Source) {
				this._tree.push("(");
				this._tree.push(source);
				this._tree.push(")");
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
		
		if (typeof join !== 'undefined') {
			if (join instanceof Join) {
				this._tree.push(join);
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
	};
	
	Source.prototype = new Clause();
	
	function SingleSource() {};
	
	SingleSource.prototype = new Clause();
	
	/**
	 * Creates a new source based on a table.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - The table name.
	 * @param {String} [databaseName] - The database name.
	 */
	function TableSource(tableName, databaseName) {
		this._tree = [];
		
		if (typeof databaseName !== 'undefined' && databaseName) {
			this._tree.push(databaseName);
			this._tree.push(".");
		}
		
		this._tree.push(tableName);
		
		if (typeof join !== 'undefined') {
			if (join instanceof Join) {
				this._tree.push(join);
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
	};
	
	TableSource.prototype = new SingleSource();
	
	/**
	 * Adds the 'AS table-alias' clause.
	 * 
	 * @param {String} tableAlias - The table alias.
	 * @returns {TableSource} This source clause for cascading or chaining additional clauses.
	 */
	TableSource.prototype.as = function(tableAlias) {
		this._tree.push(new As(tableAlias));
		
		return this;
	};
	
	/**
	 * Adds the 'INDEXED BY index-name' clause.
	 * 
	 * @param {String} indexName - The index name.
	 * @returns {TableSource} This source clause for cascading or chaining additional clauses.
	 */
	TableSource.prototype.indexedBy = function(indexName) {
		this._tree.push(" INDEXED BY ");
		this._tree.push(indexName);
		
		return this;
	};
	
	/**
	 * Adds the 'NOT INDEXED' clause.
	 * 
	 * @returns {TableSource} This source clause for cascading or chaining additional clauses.
	 */
	TableSource.prototype.notIndexed = function() {
		this._tree.push("NOT INDEXED");
		
		return this;
	};
	
	/**
	 * Creates a new source based on a select clause.
	 * 
	 * @constructor
	 * 
	 * @param {Select} selectClause - A select clause.
	 */
	function SelectSource(selectClause) {
		this._tree = [];
		
		if (selectClause instanceof Select) {
			this._tree.push("(");
			this._tree.push(selectClause);
			this._tree.push(")");
		} else {
			// TODO: Throw IllegalArgument exception.
		}
		
		if (typeof join !== 'undefined') {
			if (join instanceof Join) {
				this._tree.push(join);
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
	};
	
	SelectSource.prototype = new SingleSource();
	
	/**
	 * Adds the 'AS table-alias' clause.
	 * 
	 * @param {String} tableAlias - The table alias.
	 * @returns {SelectSource} This clause for cascading or chaining additional clauses.
	 */
	SelectSource.prototype.as = function(tableAlias) {
		this._tree.push(new As(tableAlias));
		
		return this;
	};
	
	/**
	 * Creates a new 'JOIN source join-constraint' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String|SingleSource} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 */
	function Join(source, constraint) {
		this._tree = [];
		this._tree.push(" JOIN ");
		this._tree.push(_addSource(source));
				
		if (typeof constraint !== 'undefined') {
			this._tree.push(_addConstraint(constraint));
		}
	};
	
	Join.prototype = new Clause();
	
	/**
	 * Type checks the source.
	 * 
	 * @param {Object} source
	 */
	function _addSource(source) {	
		if (typeof source === 'string') {
			return new TableSource(source);
		} else if (source instanceof SingleSource) {
			return source;
		} else {
			// TODO: Throw IllegalArgument exception.
		}
	};
	
	/**
	 * Type checks the constraint.
	 * 
	 * @param {Object} constraint
	 */
	function _addConstraint(constraint) {
		if (constraint instanceof JoinConstraint) {
			return constraint;
		} else {
			// TODO: Throw IllegalArgument exception.
		}
	};
	
	/**
	 * Adds the 'ON expr' clause.
	 * 
	 * @param {Expr} expr - A new {On} clause is created and added to this clause.
	 * @returns {Join} This clause for cascading or chaining additional clauses.
	 */
	Join.prototype.on = function(expr) {
		if (expr instanceof Expr) {
			this._tree.push(new On(expr));
		} else {
			// TODO: Throw IllegalArgument exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'USING (colum-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @param {Array} columnNames - {String} elements. A new {Using} clause is created and added to this clause.
	 * @returns {Join} This clause for cascading or chaining additional clauses.
	 */
	Join.prototype.using = function(columnNames) {
		if (value instanceof Array) {
			this._tree.push(new Using(columnNames));
		} else {
			// TODO: Throw IllegalArgument execption.
		}
		
		return this;
	};
	
	function LeftJoin(source, constraint) {
		this._tree = [];
		this._tree.push(" LEFT JOIN ");
		this._tree.push(_addSource(source));
		
		if (typeof constraint !== 'undefined') {
			this._tree.push(_addConstraint(constraint));
		}
	}
	
	LeftJoin.prototype = new Join();
	
	function LeftOuterJoin(source, constraint) {
		this._tree = [];
		this._tree.push(" LEFT OUTER JOIN ");
		this._tree.push(_addSource(source));
		
		if (typeof constraint !== 'undefined') {
			this._tree.push(_addConstraint(constraint));
		}
	}
	
	LeftOuterJoin.prototype = new Clause();
	
	function InnerJoin(source, constraint) {
		this._tree = [];
		this._tree.push(" INNER JOIN ");
		this._tree.push(_addSource(source));
		
		if (typeof constraint !== 'undefined') {
			this._tree.push(_addConstraint(constraint));
		}
	}
	
	InnerJoin.prototype = new Clause();
	
	function CrossJoin(source, constraint) {
		this._tree = [];
		this._tree.push(" CROSS JOIN ");
		this._tree.push(_addSource(source));
		
		if (typeof constraint !== 'undefined') {
			this._tree.push(_addConstraint(constraint));
		}
	}
	
	CrossJoin.prototype = new Clause();
	
	/**
	 * Creates a new 'join-constraint' clause.
	 * 
	 * This is the prototype for the {On} and {Using} clauses.
	 * 
	 * @constructor
	 */
	function JoinConstraint() {};
	
	JoinConstraint.prototype = new Clause();
	
	/**
	 * Creates a new 'ON expr' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Expr} expr - A SQL expression clause.
	 */
	function On(expr) {
		this._tree = [];
		this._tree.push(" ON ");
		
		if (expr instanceof Expr) {
			this._tree.push(expr);
		} else {
			// TODO: Throw IllegalArgument exception.
		}
	};
	
	On.prototype = new JoinConstraint();
	
	/**
	 * Creates a new 'USING (column-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @constructor.
	 * 
	 * @param {Array} columnNames - Elements are {String} objects.
	 */
	function Using(columnNames) {
		this._tree = [];
		this._tree.push(" USING ");
		this._tree.push("(");
		
		var count = columnNames.length - 1,
			i;
		
		for (i = 0; i < count; i += 1) {
			this._tree.push(columnNames[i]);
			this._tree.push(", ");
		}
		
		this._tree.push(columnNames[i]);
		this._tree.push(")");
	}
	
	Using.prototype = new JoinConstraint();
	
	/**
	 * Creates a new 'WHERE expr' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Expr} expr
	 */
	function Where(expr) {
		this._tree = [];
		this._tree.push(" WHERE ");
		this._tree.push(expr);
	};
	
	Where.prototype = new Clause();
	
	/**
	 * Creates a new '(column-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Array} names - The elements are {String} objects. The column names.
	 * @param {Values|Array} [values] - If {Array}, then a new {Values} clause is created and added.
	 */
	function Columns(names, values) {
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
		
		if (typeof values !== 'undefined') {
			if (values instanceof Values) {
				this._tree.push(values);
			} else if (values instanceof Array) {
				this._tree.push(new Values(values));
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
	};
	
	Columns.prototype = new Clause();
	
	/**
	 * Creates a new 'VALUES (value1, value2, ... , valueN)' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Array} values - Elements are either {String} or {Object}. If {Object}, the property key is used as a named parameter for the value. If {String}, a placeholder indexed parameter is created for the value.
	 */
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
	
	/**
	 * Either creates a named or indexed parameter. If the value is an object, the property key is used as the named parameter; otherwise,
	 * an indexed parameter is created.
	 * 
	 * @param {Object|String} - The value.
	 * @return {Array} A tree to be concatenated to the parent tree.
	 */
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
	 * Creates a new 'SET column-name1 = value1, column-name2 = value2, ... , column-name3 = value3' clause.
	 * 
	 * @constructor
	 * 
	 * @param {Array} columns
	 */
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
	
	/**
	 * Creates a 'column-name = bind-parameter' clause.
	 * 
	 * @param {Object} column - The property key is the column name.
	 * @return {Array} A tree.
	 */
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
	
	/**
	 * Creates a result columns list clause.
	 * 
	 * @constructor
	 * @param {Array} [columnNames] - Elements are either {String} or {Object}. If {String}, 'AS alias' clause is created and added. If {Object}, the property key is used as the alias and an 'AS alias' clause is created and added.
	 */
	function ResultColumns(columnNames) {
		this._tree = [];
		
		var count,
			i;
	
		if (typeof columnNames === 'undefined') {
			this._tree.push("*");
		} else {
			count = columnNames.length - 1;
			
			for (i = 0; i < count; i += 1) {
				this._tree = this._tree.concat(_getTreeValue(columnNames[i]));
				this._tree.push(", ");
			}
			
			this._tree = this._tree.concat(_getTreeValue(columnNames[i]));	
		}
	};
	
	ResultColumns.prototype = new Clause();
	
	/**
	 * Returns a 'AS' clause if the 'value' is an object with one property and the key is used as the alias.
	 * 
	 * @param {String|Object} value - If {String}, then the value is added directly to the clause tree. If {Object}, then 
	 */
	function _getTreeValue(value) {
		var keys,
			key,
			tree = [];
		
		if (typeof value === 'object') {
			keys = Object.keys(value);
			key = keys[0];
			tree.push(value[key]);
			tree.push(new As(key));
		} else {
			tree.push(value);
		}
		
		return tree;
	}
	
	/**
	 * Creates a new 'INSERT INTO table-name' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - A table name.
	 * @param {Columns|Array} [columns] - If {Array}, then a new {Columns} clause is created and added.
	 * @param {Values|Array} [values] - If {Array}, then a new {Values} clause is created and added.
	 */
	function Insert(tableName, columns, values) {
		this._tree = [];
		this._tree.push("INSERT INTO ");
		this._tree.push(tableName);
		this._tree.push(" ");
		
		if (typeof columns !== 'undefined') {
			if (columns instanceof Columns) {
				this._tree.push(columns);
			} else if (columns instanceof Array) {
				this._tree.push(new Columns(columns));
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
		
		if (typeof values !== 'undefined') {
			if (values instanceof Values) {
				this._tree.push(values);
			} else if (values instanceof Array) {
				this._tree.push(new Values(values));
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
	};
	
	Insert.prototype = new Clause();
	
	/**
	 * Adds the 'column-name' clause to this 'INSERT' Ramis statement.
	 * 
	 * @param {Array} names - The elements are {String} objects. The names of columns.
	 * @param {Values|Array} [values] - If {Array}, then a new {Values} clause is created and added.
	 * @returns {Insert} This clause for cascading or chaining additional clauses.
	 */
	Insert.prototype.columns = function(names, values) {
		this._tree.push(new Columns(names));
		
		return this;
	};
	
	/**
	 * Adds the 'VALUES (value1, value2, ... , valueN)' clause to the 'INSERT' clause tree.
	 * 
	 * @param {Array} values - The elements are either a {String} or an {Object}. An {Object} will have one property where the key will be used as the named parameter.
	 * @returns {Insert} This Ramis 'INSERT' clause.
	 */
	Insert.prototype.values = function(values) {
		if (this.previous() instanceof Columns) {
			this._tree.push(new Values(values));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Creates a new 'UPDATE table-name' clause.
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
	 * Adds the 'SET column-name1 = value1, column-name2 = value2, ... , column-nameN = valueN' clauses to this 'UPDATE' clause tree.
	 * 
	 * @param {Array} columns - An object literal with the keys as the column names and the values as the values to update. 
	 * @returns {Update} The 'UPDATE' clause.
	 */
	Update.prototype.set = function(columns) {
		this._tree.push(new Set(columns));
		
		return this;
	};
	
	/**
	 * Adds the 'WHERE expr' clause to this 'UPDATE' clause tree.
	 * 
	 * @param {Expr} expr
	 * @returns {Update} The 'UPDATE' clause.
	 */
	Update.prototype.where = function(expr) {
		if (this.previous() instanceof Set) {
			this._tree.push(new Where(expr));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Creates a new 'DELETE FROM table-name' clause.
	 * 
	 * @constructor
	 * 
	 * @param {String} tableName - A table name.
	 */
	function Delete(tableName) {
		this._tree = [];
		this._tree.push("DELETE FROM ");
		this._tree.push(tableName);
	};
	
	Delete.prototype = new Clause();
	
	/**
	 * Adds the 'WHERE expr' clause.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Delete} This clause for cascading or chaining additional clauses.
	 */
	Delete.prototype.where = function(expr) {
		if (expr instanceof Expr) {
			this._tree.push(new Where(expr));	
		} else {
			// TODO: Throw IllegalArgument exception.
		}
				
		return this;
	};
	
	/**
	 * Creates a new 'SELECT' clause.
	 * 
	 * @constructor
	 * 
	 * @param {ResultColumns|Array} [resultColumns] - An array of strings and/or object literals with the keys as the alias for column names.
	 * @param {From} [from] - A 'FROM' clause.
	 * @param {Where} [where] - A 'WHERE' clause.
	 */
	function Select(resultColumns, from, where) {
		this._tree = [];
		this._tree.push("SELECT ");
		
		if (typeof resultColumns !== 'undefined') {
			if (resultColumns instanceof Array) {
				this._tree.push(new ResultColumns(resultColumns));
			} else if (resultColumns instanceof ResultColumns) {
				this._tree.push(resultColumns);
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
		
		if (typeof from !== 'undefined') {
			if (from instanceof From) {
				this._tree.push(from);	
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
		
		if (typeof where !== 'undefined') {
			if (where instanceof Where) {
				this._tree.push(where);
			} else {
				// TODO: Throw IllegalArgument exception.
			}
		}
	};
	
	Select.prototype = new Clause();
	
	/**
	 * Adds the 'FROM' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - The table name. Use an object literal with the key as the alias to implement an Ramis alias.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.from = function(source) {
		if (this.previous() instanceof ResultColumns) {
			this._tree.push(new From(source));	
		} else {
			// TODO: Throw IllegalOperation exception
		}
		
		return this;
	};
	
	/**
	 * Adds the 'JOIN' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.join = function(source, constraint) {
		if (this.previous() instanceof From) {
			this._tree.push(new Join(source, constraint));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT JOIN' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.leftJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this._tree.push(new LeftJoin(source, constraint));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'LEFT OUTER JOIN' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.leftOuterJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this._tree.push(new LeftOuterJoin(source, constraint));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'INNER JOIN join-source' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.innerJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this._tree.push(new InnerJoin(source, constraints));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'CROSS JOIN join-source' clause to the 'SELECT' clause tree.
	 * 
	 * @param {String|Source} source - If {String}, then a table name is assumed and a {TableSource} is created automatically.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.crossJoin = function(source, constraint) {
		if (this.previous() instanceof From) {
			this._tree.push(new CrossJoin(source, constraint));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'ON expr' clause to the 'SELECT' clause.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.on = function(expr) {
		if (this.previous() instanceof Join) {
			this._tree.push(new On(expr));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'USING (column-name1, column-name2, ... , column-nameN)' clause.
	 * 
	 * @param {Array} columnNames - {String} elements.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.using = function(columnNames) {
		if (this.previous() instanceof Join) {
			this._tree.push(new Using(columnNames));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	/**
	 * Adds the 'WHERE expr' clause to the 'SELECT' clause tree.
	 * 
	 * @param {Expr} expr - A SQL expression.
	 * @returns {Select} This clause for cascading or chaining additional clauses.
	 */
	Select.prototype.where = function(expr) {
		if (this.previous() instanceof From || this.pervious() instanceof Join || this.previous() || JoinConstraint) {
			this._tree.push(new Where(expr));
		} else {
			// TODO: Throw IllegalOperation exception.
		}
		
		return this;
	};
	
	// TODO: Implement "GROUP BY" construction.
	// TODO: Add 'ORDER BY' construction.
	// TODO: Add 'LIMIT' construction.
	
	/**
	 * Factory method for creating a new 'AS alias' clause.
	 * 
	 * @param {String} alias - An alias.
	 * @returns {As} An 'AS alias' clause.
	 */
	Ramis.as = function(alias) {
		return new As(alias);
	};
	
	/**
	 * Factory method for creating a new '(column-name1, column-name2, ... , column-nameN)' clause. The columns clause comes directly after the 'INSERT INTO table-name' clause.
	 * 
	 * @param {Array} columnNames
	 * @returns {Columns}
	 */
	Ramis.columns = function(columnNames) {
		return new Columns(columnNames);
	};
	
	/**
	 * Factory method for creating a new 'CROSS JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {CrossJoin} A new 'CROSS JOIN single-source' clause.
	 */
	Ramis.crossJoin = function(source, constraint) {
		return new CrossJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new expression.
	 * 
	 * @returns {Expr} A new expression.
	 */
	Ramis.expr = function() {
		return new Expr();
	};
	
	/**
	 * Factory method for creating a new 'FROM join-source' clause.
	 * 
	 * @param {String|Source} source
	 * @returns {From} A new 'FROM join-source' clause.
	 */
	Ramis.from = function(source) {
		return new From(source);
	};
	
	/**
	 * Factory method for creating a new 'INNER JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {InnerJoin} A new 'INNER JOIN single-source' clause.
	 */
	Ramis.innerJoin = function(source, constraint) {
		return new InnerJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'INSERT INTO' clause.
	 * 
	 * @param {String} tableName 
	 * @returns {Insert} A new 'INSERT INTO' clause.
	 */
	Ramis.insert = function(tableName) {
		return new Insert(tableName);
	};
	
	/**
	 * Factory method for creating a new 'JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {Join} A new 'JOIN single-source' clause.
	 */
	Ramis.join = function(source, constraint) {
		return new Join(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'LEFT JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {LeftJoin} A new 'LEFT JOIN single-source' clause.
	 */
	Ramis.leftJoin = function(source, constraint) {
		return new LeftJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'LEFT OUTER JOIN single-source' clause.
	 * 
	 * @param {String|Source} source - The source of the join clause. If {String} is used, then the source is assumed to be table name and a {TableSource} is automatically created without an alias or database name prefix.
	 * @param {On|Using} [constraint] - The join constraint.
	 * @returns {LeftOuterJoin} A new 'LEFT OUTER JOIN single-source' clause.
	 */
	Ramis.leftOuterJoin = function(source, constraint) {
		return new LeftOuterJoin(source, constraint);
	};
	
	/**
	 * Factory method for creating a new 'ON expr' clause.
	 * 
	 * @param {Expr} expr
	 * @returns {On} A new 'ON expr' clause.
	 */
	Ramis.on = function(expr) {
		return new On(expr);
	};
	
	/**
	 * Factory method for creating a new 'DELETE FROM table-name' clause.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Delete} A new 'DELETE' clause.
	 */
	Ramis.remove = function(tableName) {
		return new Delete(tableName);
	};
	
	/**
	 * Factory method for creating a 'SELECT column1, column2, ... , columnN' clause.
	 * 
	 * @param {Array} resultColumns - An array of strings and/or object literals with the keys as the alias for column names.
	 * @returns {Select} A new 'SELECT column1, column2, ... , columnN' clause.
	 */
	Ramis.select = function(resultColumns) {
		return new Select(resultColumns);
	};
	
	/**
	 * Factory method for creating a new 'SET column-name1 = value1, column-name2 = value2, ... , column-nameN = valueN' clause.
	 * 
	 * @param {Array} columns
	 * @returns {Set}
	 */
	Ramis.set = function(columns) {
		return new Set(columns);
	};
	
	/**
	 * Factory method for creating a new 'UPDATE table-name' clause.
	 * 
	 * @param {String} tableName - The table name.
	 * @returns {Update} A new 'UPDATE' clause.
	 */
	Ramis.update = function(tableName) {
		return new Update(tableName);
	};
	
	/**
	 * Factory method for creating a new 'VALUES (value1, value 2, ... , valueN)' clause. The values clause comes directly after the columns clause.
	 * 
	 * @param {Array} values
	 * @returns {Values}
	 */
	Ramis.values = function(values) {
		return new Values(values);
	};
	
	/**
	 * Factory method for creating a new 'where expr' clause.
	 * 
	 * @param {Expr} expr
	 * @returns {Where}
	 */
	Ramis.where = function(expr) {
		return new Where(expr);
	};
}());