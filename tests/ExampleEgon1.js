egon.init(databaseConnection);

var companiesTable = new egon.Table('companies');
companiesTable.id = new egon.Column('companies_id', egon.types.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
companiesTable.name = new egon.Column('name', egon.types.TEXT, {notNull: true, defaultValue: null});
companiesTable.address = new egon.Column('address', egon.types.TEXT, {notNull: true, defaultValue: null});
companiesTable.phone = new egon.Column('phone_number', egon.types.TEXT, {notNull: true, defaultValue: null});
companiesTable.fax = new egon.Column('fax_number', egon.types.TEXT, {notNull: true, defaultValue: null});
companiesTable.website = new egon.Column('website', egon.types.TEXT, {notNull: true, defaultValue: null});

var jobOrderNumbersTable = new egon.Table('job_order_numbers');
jobOrderNumbersTable.id = new egon.Column('job_order_numbers_id', egon.types.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
jobOrderNumbersTable.alias = new egon.Column('alias', egon.types.TEXT, {notNull: true, defaultValue: null});
jobOrderNumbersTable.accountNumber = new egon.Column('account_number', egon.types.TEXT, {notNull: true, defaultValue: null});
jobOrderNumbersTable.description = new egon.Column('description', egon.types.TEXT, {notNull: true, defaultValue: null});

var hazmatCodesTable = new egon.Table('hazmat_codes');
hazmatCodesTable.id = new egon.Column('hazmat_codes_id', egon.types.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
hazmatCodesTable.letter = new egon.Column('letter', egon.types.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.headline = new egon.Column('headline', egon.types.TEXT, {notNull: true, defaultValue: null});
hazmatCodesTable.description = new egon.Column('description', egon.types.TEXT, {notNull: true, defaultValue: null});

var purchaseOrdersTable = new egon.Table('purchase_orders');
purchaseOrdersTable.id = new egon.Column('purchase_orders_id', egon.types.INTEGER, {primaryKey: true, notNull: true, defautlValue: null, autoIncrement: true});
purchaseOrdersTable.company = new egon.Column(companiesTable.id.name, egon.types.INTEGER, {notNull: true, defaultValue: null, foreignKey: {parent: companiesTable, column: companiesTable.id}});
purchaseOrdersTable.jobOrderNumber = new egon.Column(jobOrderNumbersTable.id.name, egon.types.INTEGER, {notNull: true, defaultValue: null, foreignKey: {parent: jobOrderNumbersTable, column: jobOrderNumbersTable.id}});
purchaseOrdersTable.title = new egon.Column('title', egon.types.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.originator = new egon.Column('originator', egon.types.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.deliverTo = new egon.Column('deliver_to', egon.types.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.priority = new egon.Column('priority', egon.types.TEXT, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateSubmitted = new egon.Column('date_submitted', egon.types.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateReceived = new egon.Column('date_received', egon.types.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateRequired = new egon.Column('date_required', egon.types.DATE, {notNull: true, defaultValue: null});
purchaseOrdersTable.dateAdded = new egon.Column('date_added', egon.types.DATE, {notNull: true, defaultValue: null});

var itemsTable = new egon.Table('items');
itemsTable.id = new egon.Column('items_id', egon.types.INTEGER, {primaryKey: true, notNull: true, defaultValue: null, autoIncrement: true});
itemsTable.purchaseOrder = new egon.Column(purchaseOrdersTable.id.name, egon.types.INTEGER, {notNull: true, defaultValue: null, foreignKey: {parent: purchaseOrdersTable, column: purchaseOrdersTable.id}});
itemsTable.partNumber = new egon.Column('part_number', egon.types.TEXT, {notNull: true, defaultValue: null});
itemsTable.description = new egon.Column('description', egon.types.TEXT, {notNull: true, defaultValue: null});
itemsTable.hazmatCode = new egon.Column('hazmat_codes_id', egon.types.INTEGER, {notNull: true, defaultValue: null, foreignKey: {parent: hazmatCodesTable, column: hazmatCodesTable.id}});
itemsTable.unitOfIssue = new egon.Column('unit_of_issue', egon.types.TEXT, {notNull: true, defaultValue: null});
itemsTable.unitPrice = new egon.Column('unit_price', egon.types.DECIMAL, {notNull: true, defaultValue: null});
itemsTable.unitPrice = new egon.Column('quantity', egon.types.INTEGER, {notNull: true, defaultValue: null});
itemsTable.dateAdded = new egon.Column('date_added', egon.types.DATE, {notNull: true, defaultValue: null});

egon.createAll();