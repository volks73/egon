Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://Egon/Spengler.js");

var dbFile = FileUtils.getFile("Desk", ["Test", "test.sqlite"]);
var dbConn = Services.storage.openDatabase(dbFile);

Spengler.init(dbConn);

var companiesTable = Spengler.table('companies');
companiesTable.id = Spengler.column('companies_id', Spengler.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
companiesTable.name = Spengler.column('name', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.address = Spengler.column('address', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.phone = Spengler.column('phone_number', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.fax = Spengler.column('fax_number', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.website = Spengler.column('website', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
companiesTable.dateAdded = Spengler.column('date_added', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});
companiesTable.dateRemoved = Spengler.column('date_removed', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});

var jobOrderNumbersTable = Spengler.table('job_order_numbers');
jobOrderNumbersTable.id = Spengler.column('job_order_numbers_id', Spengler.TYPES.INTEGER, {primaryKey: true, autoIncrement: true});
jobOrderNumbersTable.alias = Spengler.column('alias', Spengler.TYPES.TEXT);
jobOrderNumbersTable.accountNumber = Spengler.column('account_number', Spengler.TYPES.TEXT);
jobOrderNumbersTable.description = Spengler.column('description', Spengler.TYPES.TEXT);
jobOrderNumbersTable.dateAdded = Spengler.column('date_added', Spengler.TYPES.DATE);
jobOrderNumbersTable.dateRemoved = Spengler.column('date_removed', Spengler.TYPES.DATE);

var hazmatCodesTable = Spengler.table('hazmat_codes');
hazmatCodesTable.id = Spengler.column('hazmat_codes_id', Spengler.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
hazmatCodesTable.letter = Spengler.column('letter', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.headline = Spengler.column('headline', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.description = Spengler.column('description', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});

var purchaseOrdersTable = Spengler.table('purchase_orders');
purchaseOrdersTable.id = Spengler.column('purchase_orders_id', Spengler.TYPES.INTEGER, {primaryKey: true, notNull: true, defautlValue: null, autoIncrement: true});
purchaseOrdersTable.company = Spengler.column(companiesTable.id.name, Spengler.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Spengler.foreignKey('company', companiesTable, [companiesTable.id])});
purchaseOrdersTable.jobOrderNumber = Spengler.column(jobOrderNumbersTable.id.name, Spengler.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Spengler.foreignKey('job_order_number', jobOrderNumbersTable, [jobOrderNumbersTable.id])});
purchaseOrdersTable.title = Spengler.column('title', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.originator = Spengler.column('originator', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.deliverTo = Spengler.column('deliver_to', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.priority = Spengler.column('priority', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateSubmitted = Spengler.column('date_submitted', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateReceived = Spengler.column('date_received', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateRequired = Spengler.column('date_required', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateAdded = Spengler.column('date_added', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});

var itemsTable = Spengler.table('items');
itemsTable.id = Spengler.column('items_id', Spengler.TYPES.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
itemsTable.purchaseOrder = Spengler.column(purchaseOrdersTable.id.name, Spengler.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Spengler.foreignKey('purchase_order', purchaseOrdersTable, [purchaseOrdersTable.id])});
itemsTable.partNumber = Spengler.column('part_number', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.description = Spengler.column('description', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.hazmatCode = Spengler.column('hazmat_codes_id', Spengler.TYPES.INTEGER, {notNull: true, defaultValue: null, foreignKey: Spengler.foreignKey('hazmat_code', hazmatCodesTable, [hazmatCodesTable.id])});
itemsTable.unitOfIssue = Spengler.column('unit_of_issue', Spengler.TYPES.TEXT, {notNull: true, defaultValue: null});
itemsTable.unitPrice = Spengler.column('unit_price', Spengler.TYPES.DECIMAL, {notNull: true, defaultValue: null});
itemsTable.unitPrice = Spengler.column('quantity', Spengler.TYPES.INTEGER, {notNull: true, defaultValue: null});
itemsTable.dateAdded = Spengler.column('date_added', Spengler.TYPES.DATE, {notNull: true, defaultValue: null});

Spengler.createAll();

var testInsert1 = jobOrderNumbersTable.insert({alias : "test1", accountNumber : "11-1111-1-1-1", description : "description1"});
Spengler.execute(testInsert1);

var testUpdate1 = jobOrderNumbersTable.update({alias : "test2", accountNumber : "22-2222-2-2-2", description : "description2"}).where(jobOrderNumbersTable.id.equals(1));
Spengler.execute(testUpdate1);

var testSelect1 = jobOrderNumbersTable.select();
Spengler.execute(testSelect1, {});

var testSelect2 = jobOrderNumberTable.select().where(jobOrderNumbersTable.id.equals(1));
Spengler.execute(testSelect2, {});

var testSelect3 = purchaseOrdersTable.select().join(companiesTable).join(jobOrderNumbersTable).where(purchaseOrdersTable.id.equals(1));
Spengler.execute(testSelect3, {});