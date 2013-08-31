var tableName = 'job_order_numbers',
	insertColumns = ['alias', 'account_number', 'description'],
	insertValues = [{alias: 'test'}, {accountNumber: '11-1111-1-1-1'}, {description: 'test description'}],
//	insertValues = ['test', '11-1111-1-1-1', 'test description'],
	updateValues = [{alias: 'update test'}, {account_number: '22-2222-2-2-2'}, {description: 'update descriptipn'}],
	updateExpr = Spengler.expr().column('job_order_numbers_id').equals(1),
	selectColumns = ['alias', 'account_number', 'description'],
	selectExpr = Spengler.expr().column('job_order_numbers_id').equals(1),
	insert = Spengler.insert(tableName).columns(insertColumns).values(insertValues),
	update = Spengler.update(tableName).set(updateValues).where(updateExpr),
	select = Spengler.select(selectColumns).from(tableName).where(selectExpr);

console.log(insert.toString());
console.log(insert.compile().toString());

console.log(update.toString());
console.log(update.compile().toString());

console.log(select.toString());
console.log(select.compile().toString());