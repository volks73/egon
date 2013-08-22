var session = new egon.Session(databaseFile);

var Company = new egon.Entity('companies', {
	name: new egon.Field('name', egon.schema.types.TEXT, null),
	address: new egon.Field('address', egon.schema.types.TEXT, null),
	phone: new egon.Field('phone_number', egon.schema.types.INTEGER, null),
	fax: new egon.Field('fax_number', egon.schema.types.INTEGER, null),
	website: new egon.Field('website', egon.schama.types.TEXT, null),
	dateAdded: new egon.Field('date_added', egon.schema.types.DATE, null),
	dateRemoved: new egon.Field('date_removed', egon.schema.types.DATE, null),
});

var JobOrderNumber = egon.entity('job_order_numbers', {
	alias: new egon.schema.Column('alias', egon.schema.types.TEXT, null),
	accountNumber: new egon.schema.Column('account_number', egon.schema.types.TEXT, null),
	description: new egon.schema.Column('description', egon.schema.types.TEXT, null),
});

var HazmatCode = egon.entity('hazmat_codes', {
	letter: new egon.schema.Column('letter', egon.schema.types.TEXT, null),
	headline: new egon.schema.Column('headline', egon.schema.types.TEXT, null),
	description: new egon.schema.Column('description', egon.schema.tyoes.TEXT, null),
});

var Item = egon.entity('items', {
	partNumber: new egon.schema.Column('part_number', egon.schema.types.TEXT, null),
	description: new egon.schema.Column('description', egon.schema.types.TEXT, null),
	unitOfIssue: new egon.schema.Column('unit_of_issue', egon.schema.types.TEXT, null),
	unitPrice: new egon.schema.Column('unit_price', egon.schema.types.INTEGER, null),
	quantity: new egon.schema.Column('quantity', egon.schema.types.INTEGER, null),
	dateAdded: new egon.schema.Column('date_added', egon.schema.types.DATE, null),
	hazmatCode: new egon.schema.relationships.OneToMany(HazmatCodes),
});

var PurchaseOrder = egon.entity('purchase_orders', {
	title: new egon.schema.Column('title', egon.schema.types.TEXT, null),
	originator: new egon.schema.Column('originator', egon.schema.types.TEXT, null),
	deliverTo: new egon.schema.Column('deliver_to', egon.schema.types.TEXT, null),
	priority: new egon.schema.Column('priority', egon.schema.types.TEXT, null),
	note: new egon.schema.Column('note', egon.schema.types.TEXT, null),
	dateSubmitted: new egon.schema.Column('date_submitted', egon.schema.types.DATE, null),
	dateReceived: new egon.schema.Column('date_received', egon.schema.types.DATE, null),
	dateRequired: new egon.schema.Column('date_required', egon.schema.types.DATE, null),
	dateAdded: new egon.schema.Column('date_added', egon.schema.types.DATE, null),
	company: new egon.schema.relationships.OneToMany(Companies),
	jobOrderNumber: new egon.schema.relationships.OneToMany(JobOrderNumbers),
	items: new egon.schema.relationships.ManyToOne(Items),
});

var testCompany = new Company();
testCompany.name = 'Test Company';
testCompany.address = 'Test Address';
testCompany.phone = 1800555000;
testCompany.fax = 18005551111;
testCompany.website = 'http://www.example.com';

var testJobOrderNumber = new JobOrderNumber();
testJobOrderNumber.alias = 'Test Job Order Number';
testJobOrderNumber.accountNumber = '61-8906-0-2-5';
testJobOrderNumber.description = 'FY13 DHS Project';

var testPurchaseOrder = new PurchaseOrder();
testPurchaseOrder.company = testCompany;
testPurchaseOrder.jobOrderNumber = testJobOrderNumber;
testPurchaseOrder.title = 'Test Title';
testPurchaseOrder.originator = 'Test Originator';
testPurchaseOrder.deliverTo = 'Bldg ## Rm ###';
testPurchaseOrder.priority = 'Test Priority';
testPurchaseOrder.note = 'Test Note';
testPurhcaseOrder.dateSubmitted = new Date();
testPurchaesOrder.dateReceived = new Date();
testPurhcaseOrder.dateRequired = new Date();

session.commit();