var tableName = 'job_order_numbers',
	insertColumns = ['alias', 'account_number', 'description'],
	insertValues = [{alias: 'test'}, {accountNumber: '11-1111-1-1-1'}, {description: 'test description'}],
	insertValues = ['test', '11-1111-1-1-1', 'test description'],
	updateValues = [{alias: 'update test'}, {account_number: '22-2222-2-2-2'}, {description: 'update description'}],
	updateExpr = Ramis.expr().column('job_order_numbers_id').equals(1),
	selectColumns = ['alias', 'account_number', 'description'],
	selectExpr = Ramis.expr().column('job_order_numbers_id').equals(1),
	insert = Ramis.insert(tableName).columns(insertColumns).values(insertValues),
	update = Ramis.update(tableName).set(updateValues).where(updateExpr),
	select = Ramis.select(selectColumns).from(tableName).where(selectExpr);

console.log(insert.toString());
console.log(update.toString());
console.log(select.toString());

console.log(updateExpr.toString());
console.log(selectExpr.toString());