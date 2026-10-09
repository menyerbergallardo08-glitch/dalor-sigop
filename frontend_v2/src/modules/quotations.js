/**
 * DALOR SIGO-P | Módulo: QUOTATIONS.JS (Orquestador Desacoplado)
 * Submódulos independientes y especializados en ./quotations/
 */

// 1. Carga de Submódulos Especializados (< 800 líneas c/u)
import './quotations/quotations_list.js';
import './quotations/quotations_form.js';
import './quotations/quotations_print.js';
import './quotations/quotations_apu.js';

// 2. Exportaciones Seguras ES6 delegadas a las funciones en scope global window
export const goToQuotationsPage = (...args) => (window.goToQuotationsPage ? window.goToQuotationsPage(...args) : undefined);
export const changeQuotationsPageSize = (...args) => (window.changeQuotationsPageSize ? window.changeQuotationsPageSize(...args) : undefined);
export const onQuotationSearchInput = (...args) => (window.onQuotationSearchInput ? window.onQuotationSearchInput(...args) : undefined);
export const onQuotationStatusFilterChange = (...args) => (window.onQuotationStatusFilterChange ? window.onQuotationStatusFilterChange(...args) : undefined);
export const onQuotationDateFilterChange = (...args) => (window.onQuotationDateFilterChange ? window.onQuotationDateFilterChange(...args) : undefined);
export const clearQuotationFilters = (...args) => (window.clearQuotationFilters ? window.clearQuotationFilters(...args) : undefined);
export const renderQuotationsPaginated = (...args) => (window.renderQuotationsPaginated ? window.renderQuotationsPaginated(...args) : undefined);
export const loadQuotations = (...args) => (window.loadQuotations ? window.loadQuotations(...args) : undefined);
export const openNewQuotationModal = (...args) => (window.openNewQuotationModal ? window.openNewQuotationModal(...args) : undefined);
export const onTaxTypeChanged = (...args) => (window.onTaxTypeChanged ? window.onTaxTypeChanged(...args) : undefined);
export const addQuotationRow = (...args) => (window.addQuotationRow ? window.addQuotationRow(...args) : undefined);
export const removeQuotationRow = (...args) => (window.removeQuotationRow ? window.removeQuotationRow(...args) : undefined);
export const onServiceSelected = (...args) => (window.onServiceSelected ? window.onServiceSelected(...args) : undefined);
export const recalcQuotationTotals = (...args) => (window.recalcQuotationTotals ? window.recalcQuotationTotals(...args) : undefined);
export const onQuotationCurrencyChanged = (...args) => (window.onQuotationCurrencyChanged ? window.onQuotationCurrencyChanged(...args) : undefined);
export const editQuotation = (...args) => (window.editQuotation ? window.editQuotation(...args) : undefined);
export const submitCreateQuotation = (...args) => (window.submitCreateQuotation ? window.submitCreateQuotation(...args) : undefined);
export const cancelQuotationConversion = (...args) => (window.cancelQuotationConversion ? window.cancelQuotationConversion(...args) : undefined);
export const convertQuoteToProject = (...args) => (window.convertQuoteToProject ? window.convertQuoteToProject(...args) : undefined);
export const checkQuoteClientCreditRisk = (...args) => (window.checkQuoteClientCreditRisk ? window.checkQuoteClientCreditRisk(...args) : undefined);
export const onQuoteClientChanged = (...args) => (window.onQuoteClientChanged ? window.onQuoteClientChanged(...args) : undefined);
export const confirmQuoteClientRisk = (...args) => (window.confirmQuoteClientRisk ? window.confirmQuoteClientRisk(...args) : undefined);
export const cancelQuoteClientRisk = (...args) => (window.cancelQuoteClientRisk ? window.cancelQuoteClientRisk(...args) : undefined);
export const printQuotation = (...args) => (window.printQuotation ? window.printQuotation(...args) : undefined);
export const triggerPrintFromModal = (...args) => (window.triggerPrintFromModal ? window.triggerPrintFromModal(...args) : undefined);
export const goToServicesPage = (...args) => (window.goToServicesPage ? window.goToServicesPage(...args) : undefined);
export const changeServicesPageSize = (...args) => (window.changeServicesPageSize ? window.changeServicesPageSize(...args) : undefined);
export const onServiceSearchInput = (...args) => (window.onServiceSearchInput ? window.onServiceSearchInput(...args) : undefined);
export const onServiceCategoryFilterChange = (...args) => (window.onServiceCategoryFilterChange ? window.onServiceCategoryFilterChange(...args) : undefined);
export const filterAndPaginateServices = (...args) => (window.filterAndPaginateServices ? window.filterAndPaginateServices(...args) : undefined);
export const renderServicesPaginated = (...args) => (window.renderServicesPaginated ? window.renderServicesPaginated(...args) : undefined);
export const loadServices = (...args) => (window.loadServices ? window.loadServices(...args) : undefined);
export const getCustomCategories = (...args) => (window.getCustomCategories ? window.getCustomCategories(...args) : undefined);
export const getCustomUnits = (...args) => (window.getCustomUnits ? window.getCustomUnits(...args) : undefined);
export const registerCustomCategory = (...args) => (window.registerCustomCategory ? window.registerCustomCategory(...args) : undefined);
export const registerCustomUnit = (...args) => (window.registerCustomUnit ? window.registerCustomUnit(...args) : undefined);
export const getAllServiceCategories = (...args) => (window.getAllServiceCategories ? window.getAllServiceCategories(...args) : undefined);
export const getAllServiceUnits = (...args) => (window.getAllServiceUnits ? window.getAllServiceUnits(...args) : undefined);
export const populateServiceCategoriesAndUnits = (...args) => (window.populateServiceCategoriesAndUnits ? window.populateServiceCategoriesAndUnits(...args) : undefined);
export const onServiceCategoryChanged = (...args) => (window.onServiceCategoryChanged ? window.onServiceCategoryChanged(...args) : undefined);
export const onServiceUnitChanged = (...args) => (window.onServiceUnitChanged ? window.onServiceUnitChanged(...args) : undefined);
export const onEditServiceCategoryChanged = (...args) => (window.onEditServiceCategoryChanged ? window.onEditServiceCategoryChanged(...args) : undefined);
export const onEditServiceUnitChanged = (...args) => (window.onEditServiceUnitChanged ? window.onEditServiceUnitChanged(...args) : undefined);
export const openNewServiceModal = (...args) => (window.openNewServiceModal ? window.openNewServiceModal(...args) : undefined);
export const submitCreateService = (...args) => (window.submitCreateService ? window.submitCreateService(...args) : undefined);
export const openEditServiceModal = (...args) => (window.openEditServiceModal ? window.openEditServiceModal(...args) : undefined);
export const submitEditService = (...args) => (window.submitEditService ? window.submitEditService(...args) : undefined);
export const deleteService = (...args) => (window.deleteService ? window.deleteService(...args) : undefined);
export const calcEditServiceMargin = (...args) => (window.calcEditServiceMargin ? window.calcEditServiceMargin(...args) : undefined);
export const calcNewServiceMargin = (...args) => (window.calcNewServiceMargin ? window.calcNewServiceMargin(...args) : undefined);
