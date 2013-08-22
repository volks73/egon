var expression = spengler.select().from('companies');
var expression = spengler.select().from('companies').where('companies_id').equals('0');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').equals('0');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').lessThan('1');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').greaterThan('1');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').lessThanEquals('1');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').greaterThanEquals('1');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').greaterThan('1').and().lessThan('10');
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').greaterThan('1').and().lessThan('10').limit(5);
var expression = spengler.select([{id: 'companies_id', name: 'name'}]).from('companies').where('companies_id').greaterThan('1').and().lessThan('10').orderBy('DESC').limit(5);

var expression = spengler.insert({f1: '1', f2: '1.2', f3: true, f4: 'blah', f5: null}).into('companies');