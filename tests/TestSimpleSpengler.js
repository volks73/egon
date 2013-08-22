var expression = new spengler.Expression();
expression.insert().into('companies').values({
	f1: '1', 
	f2: '1.2', 
	f3: true, 
	f4: 'blah', 
	f5: null,
});

console.log(expression.toString());