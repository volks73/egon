var session = new egon.Session();

var Company = new egon.Entity(session, 'companies', {
	name: new egon.Field('name', egon.schema.types.TEXT, null),
	address: new egon.Field('address', egon.schema.types.TEXT, null),
	phone: new egon.Field('phone_number', egon.schema.types.INTEGER, null),
	fax: new egon.Field('fax_number', egon.schema.types.INTEGER, null),
	website: new egon.Field('website', egon.schema.types.TEXT, null),
	dateAdded: new egon.Field('date_added', egon.schema.types.DATE, null),
	dateRemoved: new egon.Field('date_removed', egon.schema.types.DATE, null)
});

var testCompany1 = new Company();
var testCompany2 = new Company();

testCompany1.name = 'Test Company 1';
testCompany1.address = 'Test Address 1';
testCompany1.phone = 18005551111;
testCompany1.fax = 18005551111;
testCompany1.website = 'http://www.example1.com';

testCompany2.name = 'Test Company 2';
testCompany2.address = 'Test Address 2';
testCompany2.phone = 18005552222;
testCompany2.fax = 18005552222;
testCompany2.website = 'http://www.example2.com';

testCompany1.name = 'Test Company 1';
testCompany1.address = 'Test Address 1';

console.log("testCompany1.name: " + testCompany1.name);
console.log("testCompany1.address: " + testCompany1.address);
console.log("testCompany2.name: " + testCompany2.name);
console.log("testCompany2.address: " + testCompany2.address);

session.commit();