Components.utils.import("resource://Egon/Spengler.js");

var insert = Spengler.insert().into('job_order_numbers').
	columns(['alias', 
	         'account_number', 
	         'description']).
	values({alias: 'test job order number', 
			account_number: '11-1111-1-1-1', 
			description: 'test description'});
console.log(insert.toString());
console.log(insert.compile().toString());