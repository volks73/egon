Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://Egon/Egon.js");

var dbFile = FileUtils.getFile("Desk", ["Test", "test.sqlite"]);
var dbConn = Services.storage.openDatabase(dbFile);

Egon.init(dbConn);

var companiesTable = new Egon.Table('companies');
companiesTable.id = new Egon.Column('companies_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
companiesTable.name = new Egon.Column('name', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.address = new Egon.Column('address', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.phone = new Egon.Column('phone_number', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.fax = new Egon.Column('fax_number', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.website = new Egon.Column('website', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.dateAdded = new Egon.Column('date_added', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
companiesTable.dateRemoved = new Egon.Column('date_removed', Egon.TYPES.DATE, {notNull: true, defaultValue: null});

var jobOrderNumbersTable = new Egon.Table('job_order_numbers');
jobOrderNumbersTable.id = new Egon.Column('job_order_numbers_id', Egon.TYPES.INTEGER, {primaryKey: true, autoIncrement: true});
jobOrderNumbersTable.alias = new Egon.Column('alias', Egon.TYPES.TEXT);
jobOrderNumbersTable.accountNumber = new Egon.Column('account_number', Egon.TYPES.TEXT);
jobOrderNumbersTable.description = new Egon.Column('description', Egon.TYPES.TEXT);
jobOrderNumbersTable.dateAdded = new Egon.Column('date_added', Egon.TYPES.DATE);
jobOrderNumbersTable.dateRemoved = new Egon.Column('date_removed', Egon.TYPES.DATE);

var hazmatCodesTable = new Egon.Table('hazmat_codes');
hazmatCodesTable.id = new Egon.Column('hazmat_codes_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
hazmatCodesTable.letter = new Egon.Column('letter', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.headline = new Egon.Column('headline', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.description = new Egon.Column('description', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});

var purchaseOrdersTable = new Egon.Table('purchase_orders');
purchaseOrdersTable.id = new Egon.Column('purchase_orders_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defautlValue: null, autoIncrement: true});
purchaseOrdersTable.company = new Egon.Column(companiesTable.id.name, Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new Egon.ForeignKey('company', companiesTable, [companiesTable.id])});
purchaseOrdersTable.jobOrderNumber = new Egon.Column(jobOrderNumbersTable.id.name, Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new Egon.ForeignKey('job_order_number', jobOrderNumbersTable, [jobOrderNumbersTable.id])});
purchaseOrdersTable.title = new Egon.Column('title', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.originator = new Egon.Column('originator', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.deliverTo = new Egon.Column('deliver_to', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.priority = new Egon.Column('priority', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateSubmitted = new Egon.Column('date_submitted', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateReceived = new Egon.Column('date_received', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateRequired = new Egon.Column('date_required', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateAdded = new Egon.Column('date_added', Egon.TYPES.DATE, {notNull: true, defaultValue: null});

var itemsTable = new Egon.Table('items');
itemsTable.id = new Egon.Column('items_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
itemsTable.purchaseOrder = new Egon.Column(purchaseOrdersTable.id.name, Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new Egon.ForeignKey('purchase_order', purchaseOrdersTable, [purchaseOrdersTable.id])});
itemsTable.partNumber = new Egon.Column('part_number', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.description = new Egon.Column('description', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.hazmatCode = new Egon.Column('hazmat_codes_id', Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new Egon.ForeignKey('hazmat_code', hazmatCodesTable, [hazmatCodesTable.id])});
itemsTable.unitOfIssue = new Egon.Column('unit_of_issue', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.unitPrice = new Egon.Column('unit_price', Egon.TYPES.DECIMAL, {notNull: true, defaultValue: null});
itemsTable.unitPrice = new Egon.Column('quantity', Egon.TYPES.INTEGER, {notNull: true, defaultValue: null});
itemsTable.dateAdded = new Egon.Column('date_added', Egon.TYPES.DATE, {notNull: true, defaultValue: null});

Egon.createAll();

var debugCallback = {
	handleResult: function(aResultSet) {},

	handleError: function(aError) {
	    dump("Error: " + aError.message + "\n");
	},
		
	handleCompletion: function(aReason) {
		dump("Completed!\n");
	}
};

Egon.execute(jobOrderNumbersTable.insert({
	alias: 'test job order number', 
	accountNumber: '11-1111-1-1-1', 
	description: 'Test description'}), debugCallback);
Egon.execute(jobOrderNumbersTable.update({
	alias: 'updated job order number',
	accountNumber: '22-2222-2-2-2',
	description: 'updated description',
}).where(jobOrderNumbersTable.id.equals(1)), debugCallback);
Egon.execute(jobOrderNumbersTable.remove().where(jobOrderNumbersTable.id.equals(1)));