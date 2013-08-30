Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://Egon/Spengler.js");
Components.utils.import("resource://Egon/Egon.js");

dump(Spengler);
dump(Egon);

var dbFile = FileUtils.getFile("Desk", ["Test", "test.sqlite"]);
var dbConn = Services.storage.openDatabase(dbFile);

Egon.init(dbConn);

var companiesTable = Egon.table('companies');
companiesTable.id = Egon.column('companies_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
companiesTable.name = Egon.column('name', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.address = Egon.column('address', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.phone = Egon.column('phone_number', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.fax = Egon.column('fax_number', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.website = Egon.column('website', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.dateAdded = Egon.column('date_added', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
companiesTable.dateRemoved = Egon.column('date_removed', Egon.TYPES.DATE, {notNull: true, defaultValue: null});

var jobOrderNumbersTable = Egon.table('job_order_numbers');
jobOrderNumbersTable.id = Egon.column('job_order_numbers_id', Egon.TYPES.INTEGER, {primaryKey: true, autoIncrement: true});
jobOrderNumbersTable.alias = Egon.column('alias', Egon.TYPES.TEXT);
jobOrderNumbersTable.accountNumber = Egon.column('account_number', Egon.TYPES.TEXT);
jobOrderNumbersTable.description = Egon.column('description', Egon.TYPES.TEXT);
jobOrderNumbersTable.dateAdded = Egon.column('date_added', Egon.TYPES.DATE);
jobOrderNumbersTable.dateRemoved = Egon.column('date_removed', Egon.TYPES.DATE);

var hazmatCodesTable = Egon.table('hazmat_codes');
hazmatCodesTable.id = Egon.column('hazmat_codes_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
hazmatCodesTable.letter = Egon.column('letter', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.headline = Egon.column('headline', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.description = Egon.column('description', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});

var purchaseOrdersTable = Egon.table('purchase_orders');
purchaseOrdersTable.id = Egon.column('purchase_orders_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defautlValue: null, autoIncrement: true});
purchaseOrdersTable.company = Egon.column(companiesTable.id.name, Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Egon.foreignKey('company', companiesTable, [companiesTable.id])});
purchaseOrdersTable.jobOrderNumber = Egon.column(jobOrderNumbersTable.id.name, Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Egon.foreignKey('job_order_number', jobOrderNumbersTable, [jobOrderNumbersTable.id])});
purchaseOrdersTable.title = Egon.column('title', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.originator = Egon.column('originator', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.deliverTo = Egon.column('deliver_to', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.priority = Egon.column('priority', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateSubmitted = Egon.column('date_submitted', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateReceived = Egon.column('date_received', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateRequired = Egon.column('date_required', Egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateAdded = Egon.column('date_added', Egon.TYPES.DATE, {notNull: true, defaultValue: null});

var itemsTable = Egon.table('items');
itemsTable.id = Egon.column('items_id', Egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
itemsTable.purchaseOrder = Egon.column(purchaseOrdersTable.id.name, Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Egon.foreignKey('purchase_order', purchaseOrdersTable, [purchaseOrdersTable.id])});
itemsTable.partNumber = Egon.column('part_number', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.description = Egon.column('description', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.hazmatCode = Egon.column('hazmat_codes_id', Egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Egon.foreignKey('hazmat_code', hazmatCodesTable, [hazmatCodesTable.id])});
itemsTable.unitOfIssue = Egon.column('unit_of_issue', Egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.unitPrice = Egon.column('unit_price', Egon.TYPES.DECIMAL, {notNull: true, defaultValue: null});
itemsTable.unitPrice = Egon.column('quantity', Egon.TYPES.INTEGER, {notNull: true, defaultValue: null});
itemsTable.dateAdded = Egon.column('date_added', Egon.TYPES.DATE, {notNull: true, defaultValue: null});

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
Egon.execute(jobOrderNumbersTable.remove().where(jobOrderNumbersTable.id.equals(1).and().column(jobOrderNumbersTable.alias.equals("temp"))));