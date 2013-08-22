var Company = new egon.Category(companiesTable);
var JobOrderNumber = new egon.Category(jobOrderNumbersTable);
var PurchaseOrder = new egon.Category(purchaseOrderTable);

var aCompany = new Company();
aCompany.name = 'Test Company 1';
aCompany.address = 'Test Address 1';
aCompany.phone = '18005551111';
aCompany.fax = '18885551111';
aCompany.website = 'http://www.example1.com';

var aJobOrderNumber = new JobOrderNumber();
aJobOrderNumber.alias = 'Test Alias 1';
aJobOrderNumber.accountNumber = '61-8906-0-2-5';
aJobOrderNumber.description = 'Test Description 1';

var aPurchaseOrder = new PurchaseOrder();
aPurchaseOrder.company = aCompany;
aPurchaseOrder.jobOrderNumber = aJobOrderNumber;