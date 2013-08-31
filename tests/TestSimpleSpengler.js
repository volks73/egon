var tableName = 'job_order_numbers';
var insertColumns = ['alias', 'account_number', 'description'];
var insertValues = ['test', '11-1111-1-1-1', 'test description'];
var updateValues = [{alias: 'update test'}, {account_number: '22-2222-2-2-2'}, {description: 'update descriptipn'}];
var selectColumns = ['alias', 'account_number', 'description'];

Spengler.insert(tableName).columns(insertColumns).values(insertValues);
Spengler.update(tableName).set(updateValues).where(expr);
Spengler.remove(tableName).where(expr);
Spengler.select(selectColumns).from(tableName).where(expr);

Spengler.select(selectColumns).from(tableName).where(whereExpr);
Spengler.select(selectColumns).from("job_order_numbers").join("companies").on(onExpr).where(whereExpr);