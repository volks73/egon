egon.init(databaseFile);

var Company = new egon.Class('companies', {
	name: new egon.Column('name', egon.types.TEXT, null),
	address: new egon.Column('address', egon.types.TEXT, null),
	phone: new egon.Column('phone_number', egon.types.INTEGER, null),
	fax: new egon.Column('fax_number', egon.types.INTEGER, null),
	website: new egon.Column('website', egon.types.TEXT, null),
	dateAdded: new egon.Column('date_added', egon.types.DATE, null),
	dateRemoved: new egon.Column('date_removed', egon.types.DATE, null),
});

var JobOrderNumber = new egon.Class('job_order_numbers', {
	alias: new egon.Column('alias', egon.types.TEXT, null),
	accountNumber: new egon.Column('account_number', egon.types.TEXT, null),
	description: new egon.Column('description', egon.types.TEXT, null),
});

var HazmatCode = new egon.Class('hazmat_codes', {
	letter: new egon.Column('letter', egon.types.TEXT, null),
	headline: new egon.Column('headline', egon.types.TEXT, null),
	description: new egon.Column('description', egon.types.TEXT, null),
});

var Item = new egon.Class('items', {
	partNumber: new egon.Column('part_number', egon.types.TEXT, null),
	description: new egon.Column('description', egon.types.TEXT, null),
	unitOfIssue: new egon.Column('unit_of_issue', egon.types.TEXT, null),
	unitPrice: new egon.Column('unit_price', egon.types.INTEGER, null),
	quantity: new egon.Column('quantity', egon.types.INTEGER, null),
	dateAdded: new egon.Column('date_added', egon.types.DATE, null),
	hazmatCode: new egon.relationships.OneToMany(HazmatCodes),
});

var PurchaseOrder = new egon.Class('purchase_orders', {
	title: new egon.Column('title', egon.types.TEXT, null),
	originator: new egon.Column('originator', egon.types.TEXT, null),
	deliverTo: new egon.Column('deliver_to', egon.types.TEXT, null),
	priority: new egon.Column('priority', egon.types.TEXT, null),
	note: new egon.Column('note', egon.types.TEXT, null),
	dateSubmitted: new egon.Column('date_submitted', egon.types.DATE, null),
	dateReceived: new egon.Column('date_received', egon.types.DATE, null),
	dateRequired: new egon.Column('date_required', egon.types.DATE, null),
	dateAdded: new egon.Column('date_added', egon.types.DATE, null),
	company: new egon.relationships.OneToMany(Companies),
	jobOrderNumber: new egon.relationships.OneToMany(JobOrderNumbers),
	items: new egon.relationships.ManyToOne(Items),
});

egon.createMetaData();

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