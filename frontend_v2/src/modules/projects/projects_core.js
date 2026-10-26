// Sigop ERP - Orquestador Projects Core
// Modularizado bajo Clean Architecture (< 450 líneas por submódulo)

import {
    loadProjectsList,
    changeProjectPageSize,
    goToProjectPage,
    setProjectCxcFilter,
    filterProjectsList,
    renderProjectsWithPagination,
    renderProjectsPaginationControls,
    renderProjectCardHtml
} from './core/projects_core_list.js';

import {
    setProjectType,
    onProjectLocationInput,
    applyEditProjectSedeRules,
    onEditProjectLocationInput,
    switchProjectSubtab,
    initProjectPlanningView,
    populatePlanDropdownSelectors,
    filterPlanSelect,
    recalcProjectBudgetPreview,
    submitCreateProject
} from './core/projects_core_create.js';

import {
    onPlanToolModelSelected,
    onPlanToolUnitSelected,
    onPlanMaterialSelected,
    updatePlanMaterialsCostTotal,
    addPlanResource,
    removePlanResource,
    assignPersonnelTag,
    removePersonnelTag,
    assignVehicleTag,
    removeVehicleTag,
    assignToolTag,
    removeToolTag,
    renderAssignedTags
} from './core/projects_core_planning_resources.js';

import {
    updatePhaseWeightsSumIndicator,
    distributePhaseWeightsEqually,
    updateTaskWeightsSumIndicator,
    distributeTaskWeightsEqually,
    distributeSubGroup,
    distributeTaskWeightsByHours,
    calcWeightsFromHours,
    indentCreationTaskRow,
    addProjectPhaseRow,
    addProjectPhaseTask,
    addProjectPhaseTaskRow,
    removeProjectPhaseRow,
    renumberPhasesAndTasks
} from './core/projects_core_phases_wbs.js';

import {
    viewProjectDetails,
    toggleProjectTask,
    updateProjectTaskProgress,
    updatePhaseStatus
} from './core/projects_core_details.js';

import {
    openConfigurePhaseWeightsModal,
    updateModalTaskWeightsSumIndicator,
    distributeModalTaskWeightsEqually,
    distributeModalTaskWeightsByHours,
    submitConfigurePhaseWeights
} from './core/projects_core_weights.js';

import {
    downloadExcelTemplate,
    triggerExcelImport,
    handleExcelFileSelected,
    deleteProject,
    closeAndCulminateProject
} from './core/projects_core_actions.js';

// Re-exports
export {
    loadProjectsList,
    changeProjectPageSize,
    goToProjectPage,
    setProjectCxcFilter,
    filterProjectsList,
    renderProjectsWithPagination,
    renderProjectsPaginationControls,
    renderProjectCardHtml,
    setProjectType,
    onProjectLocationInput,
    applyEditProjectSedeRules,
    onEditProjectLocationInput,
    switchProjectSubtab,
    initProjectPlanningView,
    populatePlanDropdownSelectors,
    filterPlanSelect,
    recalcProjectBudgetPreview,
    submitCreateProject,
    onPlanToolModelSelected,
    onPlanToolUnitSelected,
    onPlanMaterialSelected,
    updatePlanMaterialsCostTotal,
    addPlanResource,
    removePlanResource,
    assignPersonnelTag,
    removePersonnelTag,
    assignVehicleTag,
    removeVehicleTag,
    assignToolTag,
    removeToolTag,
    renderAssignedTags,
    updatePhaseWeightsSumIndicator,
    distributePhaseWeightsEqually,
    updateTaskWeightsSumIndicator,
    distributeTaskWeightsEqually,
    distributeSubGroup,
    distributeTaskWeightsByHours,
    calcWeightsFromHours,
    indentCreationTaskRow,
    addProjectPhaseRow,
    addProjectPhaseTask,
    addProjectPhaseTaskRow,
    removeProjectPhaseRow,
    renumberPhasesAndTasks,
    viewProjectDetails,
    toggleProjectTask,
    updateProjectTaskProgress,
    updatePhaseStatus,
    openConfigurePhaseWeightsModal,
    updateModalTaskWeightsSumIndicator,
    distributeModalTaskWeightsEqually,
    distributeModalTaskWeightsByHours,
    submitConfigurePhaseWeights,
    downloadExcelTemplate,
    triggerExcelImport,
    handleExcelFileSelected,
    deleteProject,
    closeAndCulminateProject
};

// 100% retrocompatibilidad con window.* e index.html
if (typeof window !== 'undefined') {
    window.loadProjectsList = loadProjectsList;
    window.changeProjectPageSize = changeProjectPageSize;
    window.goToProjectPage = goToProjectPage;
    window.setProjectCxcFilter = setProjectCxcFilter;
    window.filterProjectsList = filterProjectsList;
    window.renderProjectsWithPagination = renderProjectsWithPagination;
    window.renderProjectsPaginationControls = renderProjectsPaginationControls;
    window.renderProjectCardHtml = renderProjectCardHtml;
    window.setProjectType = setProjectType;
    window.onProjectLocationInput = onProjectLocationInput;
    window.applyEditProjectSedeRules = applyEditProjectSedeRules;
    window.onEditProjectLocationInput = onEditProjectLocationInput;
    window.switchProjectSubtab = switchProjectSubtab;
    window.initProjectPlanningView = initProjectPlanningView;
    window.populatePlanDropdownSelectors = populatePlanDropdownSelectors;
    window.filterPlanSelect = filterPlanSelect;
    window.recalcProjectBudgetPreview = recalcProjectBudgetPreview;
    window.submitCreateProject = submitCreateProject;
    window.onPlanToolModelSelected = onPlanToolModelSelected;
    window.onPlanToolUnitSelected = onPlanToolUnitSelected;
    window.onPlanMaterialSelected = onPlanMaterialSelected;
    window.updatePlanMaterialsCostTotal = updatePlanMaterialsCostTotal;
    window.addPlanResource = addPlanResource;
    window.removePlanResource = removePlanResource;
    window.assignPersonnelTag = assignPersonnelTag;
    window.removePersonnelTag = removePersonnelTag;
    window.assignVehicleTag = assignVehicleTag;
    window.removeVehicleTag = removeVehicleTag;
    window.assignToolTag = assignToolTag;
    window.removeToolTag = removeToolTag;
    window.renderAssignedTags = renderAssignedTags;
    window.updatePhaseWeightsSumIndicator = updatePhaseWeightsSumIndicator;
    window.distributePhaseWeightsEqually = distributePhaseWeightsEqually;
    window.updateTaskWeightsSumIndicator = updateTaskWeightsSumIndicator;
    window.distributeTaskWeightsEqually = distributeTaskWeightsEqually;
    window.distributeSubGroup = distributeSubGroup;
    window.distributeTaskWeightsByHours = distributeTaskWeightsByHours;
    window.calcWeightsFromHours = calcWeightsFromHours;
    window.indentCreationTaskRow = indentCreationTaskRow;
    window.addProjectPhaseRow = addProjectPhaseRow;
    window.addProjectPhaseTask = addProjectPhaseTask;
    window.addProjectPhaseTaskRow = addProjectPhaseTaskRow;
    window.removeProjectPhaseRow = removeProjectPhaseRow;
    window.renumberPhasesAndTasks = renumberPhasesAndTasks;
    window.viewProjectDetails = viewProjectDetails;
    window.toggleProjectTask = toggleProjectTask;
    window.updateProjectTaskProgress = updateProjectTaskProgress;
    window.updatePhaseStatus = updatePhaseStatus;
    window.openConfigurePhaseWeightsModal = openConfigurePhaseWeightsModal;
    window.updateModalTaskWeightsSumIndicator = updateModalTaskWeightsSumIndicator;
    window.distributeModalTaskWeightsEqually = distributeModalTaskWeightsEqually;
    window.distributeModalTaskWeightsByHours = distributeModalTaskWeightsByHours;
    window.submitConfigurePhaseWeights = submitConfigurePhaseWeights;
    window.downloadExcelTemplate = downloadExcelTemplate;
    window.triggerExcelImport = triggerExcelImport;
    window.handleExcelFileSelected = handleExcelFileSelected;
    window.deleteProject = deleteProject;
    window.closeAndCulminateProject = closeAndCulminateProject;
}
