Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://Egon/egon.js");

var dbFile = FileUtils.getFile("Desk", ["Test", "test.sqlite"]);
var dbConn = Services.storage.openDatabase(dbFile);

egon.init(dbConn);

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

egon.createAll();