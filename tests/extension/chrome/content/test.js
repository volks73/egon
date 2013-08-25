Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://Egon/egon.js");

var dbFile = FileUtils.getFile("Desk", ["Test", "test.sqlite"]);
var dbConn = Services.storage.openDatabase(dbFile);

egon.init(dbConn);

var companiesTable = new egon.Table('companies');
companiesTable.id = new egon.Column('companies_id', egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
companiesTable.name = new egon.Column('name', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.address = new egon.Column('address', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.phone = new egon.Column('phone_number', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.fax = new egon.Column('fax_number', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.website = new egon.Column('website', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.dateAdded = new egon.Column('date_added', egon.TYPES.DATE, {notNull: true, defaultValue: null});
companiesTable.dateRemoved = new egon.Column('date_removed', egon.TYPES.DATE, {notNull: true, defaultValue: null});

var jobOrderNumbersTable = new egon.Table('job_order_numbers');
jobOrderNumbersTable.id = new egon.Column('job_order_numbers_id', egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
jobOrderNumbersTable.alias = new egon.Column('alias', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
jobOrderNumbersTable.accountNumber = new egon.Column('account_number', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
jobOrderNumbersTable.description = new egon.Column('description', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
jobOrderNumbersTable.dateAdded = new egon.Column('date_added', egon.TYPES.DATE, {notNull: true, defaultValue: null});
jobOrderNumbersTable.dateRemoved = new egon.Column('date_removed', egon.TYPES.DATE, {notNull: true, defaultValue: null});

var hazmatCodesTable = new egon.Table('hazmat_codes');
hazmatCodesTable.id = new egon.Column('hazmat_codes_id', egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
hazmatCodesTable.letter = new egon.Column('letter', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.headline = new egon.Column('headline', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.description = new egon.Column('description', egon.TYPES.TEXT, {notNull: true, defaultValue: null});

var purchaseOrdersTable = new egon.Table('purchase_orders');
purchaseOrdersTable.id = new egon.Column('purchase_orders_id', egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defautlValue: null, autoIncrement: true});
purchaseOrdersTable.company = new egon.Column(companiesTable.id.name, egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new egon.ForeignKey('company', companiesTable, [companiesTable.id])});
purchaseOrdersTable.jobOrderNumber = new egon.Column(jobOrderNumbersTable.id.name, egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new egon.ForeignKey('job_order_number', jobOrderNumbersTable, [jobOrderNumbersTable.id])});
purchaseOrdersTable.title = new egon.Column('title', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.originator = new egon.Column('originator', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.deliverTo = new egon.Column('deliver_to', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.priority = new egon.Column('priority', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateSubmitted = new egon.Column('date_submitted', egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateReceived = new egon.Column('date_received', egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateRequired = new egon.Column('date_required', egon.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateAdded = new egon.Column('date_added', egon.TYPES.DATE, {notNull: true, defaultValue: null});

var itemsTable = new egon.Table('items');
itemsTable.id = new egon.Column('items_id', egon.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
itemsTable.purchaseOrder = new egon.Column(purchaseOrdersTable.id.name, egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new egon.ForeignKey('purchase_order', purchaseOrdersTable, [purchaseOrdersTable.id])});
itemsTable.partNumber = new egon.Column('part_number', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.description = new egon.Column('description', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.hazmatCode = new egon.Column('hazmat_codes_id', egon.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: new egon.ForeignKey('hazmat_code', hazmatCodesTable, [hazmatCodesTable.id])});
itemsTable.unitOfIssue = new egon.Column('unit_of_issue', egon.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.unitPrice = new egon.Column('unit_price', egon.TYPES.DECIMAL, {notNull: true, defaultValue: null});
itemsTable.unitPrice = new egon.Column('quantity', egon.TYPES.INTEGER, {notNull: true, defaultValue: null});
itemsTable.dateAdded = new egon.Column('date_added', egon.TYPES.DATE, {notNull: true, defaultValue: null});

egon.createAll();