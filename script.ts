let projectList: IProjectsTable[] = [];
let clientsList: ITicketsClientsTable[] = [];
let specialistsList: ISpecialistTable[] = [];
let managersList: IManagerTable[] = [];



// Инициализация
async function onInit(): Promise<void> {
    await onProjects();
}



// Общий интерфейс
interface ITable {
    name: string; // Название
    accrued: number; // Начислено
    price: number; // Стоимость
}



// Общий интерфейс проектов
interface IGeneralProjectTable {
    fot: number;
    residualFot: number; // Остаток ФОТ
    compliance: number; // Рентабельность
    grossProfit: number; // Валовая прибыль
    period: string; // Период
}
// Интерфейс для проектов
interface IProjectsTable extends ITable, IGeneralProjectTable {
    ID: string; // ID
    projectTasks: IProjectTasksTable[]; // Проектная задача
    averageProgress: number; // Средний прогресс
    showDetails: boolean; // Открытие и раскрытие меню
    otdelID: string; // ID отдела
}
// Интерфейс для проектных задач
interface IProjectTasksTable extends ITable, IGeneralProjectTable {
    progress: number; // Прогресс
    tasks: ITasksTable[]; // Задания
    difference: string; // Срок
}
// Интерфейс для заданий
interface ITasksTable extends ITable, IGeneralProjectTable {
    // Нет новых полей
}



// Общий интерфейс клиентов
interface IGeneralClientTable {
    hours: number; // Часы
    fot: number; // ФОТ
    profitability: number // Рентабельность
    grossProfit: number; // Валовая прибыль
}
// Интерфейс клиентов
interface ITicketsClientsTable extends ITable, IGeneralClientTable {
    ID: string; // ID
    tickets: ITicketsTicketsTable[]; // Тикеты
    showDetails: boolean; // Открытие и раскрытие меню
}
// Интерфейс тикетов клиентов
interface ITicketsTicketsTable extends ITable, IGeneralClientTable {
    specializations: ITicketsSpecializationsTable[] // Специализации тикетов
    period: string | any; // Период
    status: string; // Статус
    otdelID: string; // ID отдела
}
// Интерфейс специализаций тикетов
interface ITicketsSpecializationsTable extends ITable, IGeneralClientTable {
    // Нет новых полей
}



// Общий интерфейс специалистов
interface IGeneralPerformerTable {
    hours: number; // Нормо-часов
    profitability: number; // %
}
// Интерфейс специалиста
interface ISpecialistTable extends ITable, IGeneralPerformerTable {
    ID: string; // ID
    tasks: ISpecialistTasksTable[]; // Задания
    showDetails: boolean;
}
// Интерфейс заданий специалиста
interface ISpecialistTasksTable extends ITable, IGeneralPerformerTable {
    period: string; // Период
    project: string; // Проект
    otdelID: string; // ID отдела
}



// Общий интерфейс менеджеров
interface IGeneralMangerTable {
    hours: number; // Нормо-часов
}
// Интерфейс менеджера
interface IManagerTable extends ITable, IGeneralMangerTable {
    ID: string; // ID
    tasks: IManagerTasksTable[]; // Задания
    showDetails: boolean; // Открытие и раскрытие меню
}
// Интерфейс заданий менеджера
interface IManagerTasksTable extends ITable, IGeneralMangerTable {
    period: string; // Период
    project: string; // Проект
    otdelID: string; // ID отдела
}



// Получение проектов
function getProjects(): IProjectsTable[] {
    return projectList;
}

// Получение клиентов
function getClients(): ITicketsClientsTable[] {
    return clientsList;
}

// Получение специалистов
function getSpecialists(): ISpecialistTable[] {
    return specialistsList;
}

// Получение менеджеров
function getManagers(): IManagerTable[] {
    return managersList;
}



// Заполнение таблицы
async function onProjects() {
    // Инициализация переменных
    const [projects, projectTasks, tasks, accruals, tickets] = await Promise.all([
        Global.ns._project_management.app._project.search().sort("__createdAt", false).size(1000).all(),
        Global.ns._project_management.app._project_task.search().sort("_progress", false).size(1000).all(),
        Global.ns._project_management.app.tasks.search().sort("sum", false).size(1000).all(),
        Global.ns.finance.app.accruals.search().sort("__createdAt", false).size(1000).all(),
        Global.ns._project_management.app.tickets.search().sort("__createdAt", false).size(1000).all(),
    ]);


    /////////////////////////////////////////
    //////////////////ПРОЕКТЫ////////////////
    /////////////////////////////////////////
    for (const project of projects) {
        if (project.data.__deletedAt == null) {
            let project_period: any = null;

            if (project.data.period_completed) {
                project_period = await project.data.period_completed.fetch();
            }

            let item: IProjectsTable = {
                ID: project.data.__id,
                name: project.data.__name,
                projectTasks: [],
                averageProgress: 0,
                period: project_period ? project_period.data.__name : "",
                price: 0,
                fot: 0,
                accrued: 0,
                residualFot: 0,
                compliance: 0,
                grossProfit: 0,
                showDetails: false,
                otdelID: project.data.department_bind!.id,
            };

            let totalProgress = 0;
            let taskCount = 0;
            let totalProjectTaskPrice = 0;
            let totalProjectTaskFot = 0;
            let totalProjectTaskAccrued = 0;
            let averageProjectTaskCompliance = 0;
            let complianceProjectTaskCount = 0;

            for (const projectTask of projectTasks) {
                if (projectTask.data._project_ref && projectTask.data._project_ref.id === project.data.__id) {
                    let taskProgress = projectTask.data._progress !== undefined ? projectTask.data._progress : 0;

                    let projectTaskItem: IProjectTasksTable = {
                        name: projectTask.data.__name,
                        progress: taskProgress,
                        tasks: [],
                        period: "",
                        price: 0,
                        difference: "",
                        fot: 0,
                        accrued: 0,
                        residualFot: 0,
                        compliance: 0,
                        grossProfit: 0
                    };

                    let maxPeriod: string = "";
                    let totalTaskFot = 0;
                    let totalTaskAccrued = 0;
                    let averageTaskCompliance = 0;
                    let complianceTaskCount = 0;

                    for (const task of tasks) {
                        if (task.data.__status && task.data.__status.code === 'end' && task.data.period_completed && task.data.project_task && task.data.project_task.id === projectTask.data.__id) {
                            let task_period = await task.data.period_completed.fetch();

                            let exerciseItem: ITasksTable = {
                                name: task.data.__name,
                                period: task_period.data.__name,
                                price: task.data.sum ? task.data.sum.asFloat() : 0,
                                fot: task.data.fot_all ? task.data.fot_all.asFloat() : 0,
                                accrued: 0,
                                residualFot: 0,
                                compliance: 0,
                                grossProfit: 0
                            };

                            // Начисление (задания)
                            for (const accrual of accruals) {
                                if (accrual.data.zadanie && accrual.data.sum  && accrual.data.zadanie.id === task.data.__id) {
                                    exerciseItem.accrued += accrual.data.sum.asFloat();

                                    totalTaskAccrued += exerciseItem.accrued;
                                }
                            }

                            // ФОТ задания
                            if(exerciseItem.fot !== 0) {
                                totalTaskFot += exerciseItem.fot;

                                // Остаток ФОТ
                                exerciseItem.residualFot = exerciseItem.fot - exerciseItem.accrued;
                            }

                            // Соблюдение задания
                            if (task.data.sum) {
                                exerciseItem.compliance = convertToFixed(100 - exerciseItem.accrued / task.data.sum.asFloat() * 100);

                                averageTaskCompliance += exerciseItem.compliance;

                                complianceTaskCount += 1;
                            }

                            // Валовая прибыль задания
                            if (exerciseItem.price && exerciseItem.fot) {
                                exerciseItem.grossProfit = exerciseItem.price - exerciseItem.fot;
                            }

                            // Максимальный период задания
                            if (!maxPeriod) {
                                maxPeriod = task_period.data.__name;
                            } else {
                                maxPeriod = comparePeriods(maxPeriod, task_period.data.__name);
                            }

                            // План/Факт
                            if (projectTask.data._start_date && projectTask.data._end_date && projectTask.data._end_date_fact) {
                                const { _start_date: startDate, _end_date: endDate, _end_date_fact: endDateFact } = projectTask.data;

                                const startDateString = formatDateString(startDate);
                                const endDateString = formatDateString(endDate);
                                const endDateFactString = formatDateString(endDateFact);

                                const firstDateDifference = differenceInDays(startDateString, endDateString);
                                const secondDateDifference = differenceInDays(startDateString, endDateFactString);

                                projectTaskItem.difference = `${firstDateDifference}/${secondDateDifference} дн. ${secondDateDifference - firstDateDifference} дн.`;
                            }
                            projectTaskItem.tasks.push(exerciseItem);
                        }
                    }

                    // Максимальный период
                    const projectTaskStatus = projectTask.data.__status ? projectTask.data.__status.name : '';
                    if (projectTaskStatus === 'Выполнено' || projectTaskStatus === 'В архиве') {
                        projectTaskItem.period = maxPeriod;
                    }

                    // Сумма проектной задачи
                    if(projectTask.data.sum){
                        projectTaskItem.price = projectTask.data.sum.asFloat();

                        totalProjectTaskPrice += projectTaskItem.price;
                    }

                    // Начисления проектной задачи
                    if(totalTaskAccrued) {
                        projectTaskItem.accrued = totalTaskAccrued;
                    }

                    // ФОТ проектной задачи
                    if(totalTaskFot) {
                        projectTaskItem.fot = totalTaskFot;

                        // Остаток ФОТ
                        projectTaskItem.residualFot = projectTaskItem.fot - projectTaskItem.accrued
                    }

                    // Соблюдение проектной задачи
                    if(averageTaskCompliance !== 0) {
                        projectTaskItem.compliance = convertToFixed(averageTaskCompliance / complianceTaskCount);

                        averageProjectTaskCompliance += projectTaskItem.compliance;

                        complianceProjectTaskCount += 1;
                    }

                    // Валовая прибыль проектной задачи
                    if (projectTaskItem.price && projectTaskItem.fot ) {
                        projectTaskItem.grossProfit = projectTaskItem.price - projectTaskItem.fot;
                    }

                    totalProgress += taskProgress;
                    taskCount++;

                    totalProjectTaskFot += projectTaskItem.fot;
                    totalProjectTaskAccrued += projectTaskItem.accrued


                    item.projectTasks.push(projectTaskItem);
                }
            }

            // Итоговая сумма
            if(project.data.sum){
                item.price = totalProjectTaskPrice;
            }

            // Средний итоговый прогресс
            if (taskCount > 0) {
                item.averageProgress = convertToFixed(totalProgress / taskCount);
            }

            // Итоговое начисление
            if (totalProjectTaskAccrued) {
                item.accrued = totalProjectTaskAccrued;
            }

            // Итоговый ФОТ
            if(totalProjectTaskFot > 0) {
                item.fot = totalProjectTaskFot;

                //Остаток ФОТ
                item.residualFot = item.fot - item.accrued;
            }

            // Итоговое соблюдение
            if (averageProjectTaskCompliance !== 0) {
                item.compliance = convertToFixed(averageProjectTaskCompliance / complianceProjectTaskCount);
            }

            // Итоговая валовая прибыль
            if (item.price > item.fot) {
                item.grossProfit = item.price - item.fot;
            }

            projectList.push(item);
        }
    }


    /////////////////////////////////////////
    //////////////КЛИЕНТЫ/ТИКЕТЫ/////////////
    /////////////////////////////////////////
    let clients:any = [];

    for (const ticket of tickets) {
        const client = ticket.data?.client;

        if(client && !clients.some((existingClient: {id: string}) => existingClient.id === client.id)) {
            clients.push(client);
        }
    }

    if (clients.length !== 0) {
        for (const client of clients) {
            const c =  await client.fetch();

            let clientItem: ITicketsClientsTable = {
                ID: c.data.__id,
                name: c.data.__name,
                tickets: [],
                hours: 0,
                price: 0,
                fot: 0,
                profitability: 0,
                accrued: 0,
                grossProfit: 0,
                showDetails: false
            }

            let totalTicketsHours = 0;
            let totalTicketsPrice = 0;
            let totalTicketsFOT = 0;
            let totalTicketsProfitability = 0;
            let totalTicketsAccrued = 0;
            let totalTicketsGross = 0;
            let totalTicketsCount = 0;

            for (const ticket of tickets) {
                if (ticket.data.client && ticket.data.client.id === c.data.__id) {
                    let ticketItem: ITicketsTicketsTable = {
                        specializations: [],
                        name: ticket.data.__name,
                        period: "",
                        status: ticket.data.__status ? ticket.data.__status.name : "",
                        hours: 0,
                        price: 0,
                        fot: 0,
                        profitability: 0,
                        accrued: 0,
                        grossProfit: 0,
                        otdelID: ticket.data.department ? ticket.data.department.id : ""
                    }

                    // Период
                    if (ticket.data.period) {
                        const ticket_period = await ticket.data.period.fetch();

                        ticketItem.period = ticket_period.data.__name;
                    }

                    let totalSpecializationHours = 0;
                    let totalSpecializationPrice = 0;
                    let totalSpecializationFOT = 0;
                    let totalSpecializationProfitability = 0;
                    let totalSpecializationAccrued = 0;
                    let totalSpecializationGross = 0;
                    let totalSpecializationsCount = 0;

                    for (const task of tasks) {
                        if (task.data.ticket && task.data.specializaciya && task.data.ticket.id === ticket.data.__id) {
                            const ticket_specialization = await task.data.specializaciya.fetch();

                            let specializationItem: ITicketsSpecializationsTable = {
                                name: ticket_specialization.data.__name,
                                hours: task.data.hours ? task.data.hours : 0,
                                price: task.data.sum ? task.data.sum.asFloat() : 0,
                                fot: task.data.fot_all ? task.data.fot_all.asFloat() : 0,
                                profitability: 0,
                                accrued: 0,
                                grossProfit: 0,
                            };

                            totalSpecializationHours += specializationItem.hours;
                            totalSpecializationPrice += specializationItem.price;
                            totalSpecializationFOT +=specializationItem.fot;

                            // Начислено (специализация)
                            for (const accrual of accruals) {
                                if (accrual.data.zadanie && accrual.data.sum  && accrual.data.zadanie.id === task.data.__id) {
                                    specializationItem.accrued += accrual.data.sum.asFloat();

                                    totalSpecializationAccrued += specializationItem.accrued;
                                }
                            }

                            // Рентабельность (специализация)
                            if(task.data.sum) {
                                specializationItem.profitability = convertToFixed(100 - specializationItem.accrued / task.data.sum.asFloat() * 100);

                                totalSpecializationProfitability += specializationItem.profitability;
                            }

                            // Валовая прибыль (специализация)
                            if(specializationItem.price && specializationItem.fot) {
                                specializationItem.grossProfit = specializationItem.price - specializationItem.fot;

                                totalSpecializationGross += specializationItem.grossProfit;
                            }

                            ticketItem.specializations.push(specializationItem);

                            totalSpecializationsCount += 1;
                        }
                    }
                    // Часы (тикеты)
                    if (totalSpecializationHours) {
                        ticketItem.hours = totalSpecializationHours;

                        totalTicketsHours += ticketItem.hours;
                    }

                    // Цена (тикеты)
                    if (totalSpecializationPrice) {
                        ticketItem.price = totalSpecializationPrice;

                        totalTicketsPrice += ticketItem.price;
                    }

                    // ФОТ (тикеты)
                    if (totalSpecializationFOT) {
                        ticketItem.fot = totalSpecializationFOT;

                        totalTicketsFOT += ticketItem.fot;
                    }

                    // Рентабельность (тикеты)
                    if (totalSpecializationProfitability && totalSpecializationsCount) {
                        ticketItem.profitability = convertToFixed(totalSpecializationProfitability / totalSpecializationsCount);

                        totalTicketsProfitability += ticketItem.profitability;
                    }

                    // Начислено (тикеты)
                    if (totalSpecializationAccrued) {
                        ticketItem.accrued = totalSpecializationAccrued;

                        totalTicketsAccrued += ticketItem.accrued;
                    }

                    // Валовая прибыль
                    if (totalSpecializationGross) {
                        ticketItem.grossProfit = totalSpecializationGross;

                        totalTicketsGross += ticketItem.grossProfit;
                    }

                    clientItem.tickets.push(ticketItem);

                    totalTicketsCount += 1;
                }
            }
            // Переменные для клиента
            clientItem.hours = totalTicketsHours;
            clientItem.price = totalTicketsPrice;
            clientItem.fot = totalTicketsFOT;
            clientItem.profitability = convertToFixed(totalTicketsProfitability / totalTicketsCount);
            clientItem.accrued = totalTicketsAccrued;
            clientItem.grossProfit = totalTicketsGross;

            clientsList.push(clientItem);
        }
    }


    /////////////////////////////////////////
    ////////////////СПЕЦИАЛИСТЫ//////////////
    /////////////////////////////////////////
    let specialists: any = [];

    for (const task of tasks) {
        const specialist = task.data?.performer;
        if (specialist && !specialists.some((existingPerformer: { id: string; }) => existingPerformer.id === specialist.id)) {
            specialists.push(specialist);
        }
    }

    if(specialists.length !== 0) {
        for(const specialist of specialists) {
            const s = await specialist.fetch();

            let performerItem: ISpecialistTable = {
                ID: s.data.__id,
                name: s.data.__name,
                hours: 0,
                price: 0,
                profitability: 0,
                accrued: 0,
                tasks: [],
                showDetails: false
            }

            let totalPerformersHours = 0;
            let totalPerformersPrice = 0;
            let totalPerformersAccrued = 0;
            let totalPerformersProfitability = 0;
            let totaPerformersCount = 0;

            for (const task of tasks) {
                if(task.data.performer && task.data.performer.id === s.data.__id && task.data.__status && task.data.__status.code === 'end' && task.data.department && task.data.__deletedAt !== null) {
                    let taskItem: ISpecialistTasksTable = {
                        name: task.data.__name,
                        period: "",
                        project: "",
                        hours: task.data.hours ? task.data.hours : 0,
                        price: task.data.fot_performer ? task.data.fot_performer.asFloat() : 0,
                        profitability: 0,
                        accrued: 0,
                        otdelID: task.data.department.id,
                    }

                    // Начислено (задания)
                    for (const accrual of accruals) {
                        if (accrual.data.zadanie && accrual.data.sum  && accrual.data.zadanie.id === task.data.__id && accrual.data.role && accrual.data.role.name === 'Исполнитель') {
                            taskItem.accrued += accrual.data.sum.asFloat();

                            totalPerformersAccrued += taskItem.accrued;
                        }
                    }

                    if (taskItem.accrued !== 0) {
                        // Период (задания)
                        if (task.data.period_completed) {
                            let task_period = await task.data.period_completed.fetch();

                            taskItem.period = task_period.data.__name;
                        }

                        // Проект (Задания)
                        if (task.data.project) {
                            let task_project = await task.data.project.fetch();

                            taskItem.project = task_project.data.__name;
                        }

                        totalPerformersHours += taskItem.hours;
                        totalPerformersPrice += taskItem.price;

                        // Рентабельность (задания)
                        if(task.data.sum && task.data.sum.asFloat() !== 0) {
                            taskItem.profitability = convertToFixed(100 - taskItem.accrued / task.data.sum.asFloat() * 100);

                            totalPerformersProfitability += taskItem.profitability;
                        }

                        performerItem.tasks.push(taskItem);

                        totaPerformersCount += 1;
                    }
                }
            }

            performerItem.hours = totalPerformersHours;
            performerItem.price = totalPerformersPrice;
            performerItem.profitability = convertToFixed(totalPerformersProfitability / totaPerformersCount);
            performerItem.accrued = totalPerformersAccrued;

            if(performerItem.accrued > 0) {
                specialistsList.push(performerItem);
            }
        }
    }


    /////////////////////////////////////////
    /////////////////МЕНЕДЖЕРЫ///////////////
    /////////////////////////////////////////
    let managers: UserItemRef[] = [];

    for (const task of tasks) {
        const manager = task.data?.manager;
        if (manager && !managers.some(existingManager => existingManager.id === manager.id)) {
            managers.push(manager);
        }
    }

    if(managers.length !== 0) {
        for(const manager of managers) {
            const m = await manager.fetch();

            let managerItem: IManagerTable = {
                ID: m.data.__id,
                name: m.data.__name,
                hours: 0,
                price: 0,
                accrued: 0,
                tasks: [],
                showDetails: false
            }

            let totalManagerHours = 0;
            let totalManagerPrice = 0;
            let totalManagerAccrued = 0;

            for (const task of tasks) {
                if(task.data.manager && task.data.manager.id === m.data.__id && task.data.__status && task.data.__status.code === 'end' && task.data.department && task.data.__deletedAt !== null) {
                    let taskItem: IManagerTasksTable = {
                        name: task.data.__name,
                        period: "",
                        project: "",
                        hours: task.data.hours ? task.data.hours : 0,
                        price: task.data.fot_manager ? task.data.fot_manager.asFloat() : 0,
                        accrued: 0,
                        otdelID: task.data.department.id,
                    }

                    // Начислено (задания)
                    for (const accrual of accruals) {
                        if (accrual.data.zadanie && accrual.data.sum  && accrual.data.zadanie.id === task.data.__id && accrual.data.role && accrual.data.role.name === 'Менеджер') {
                            taskItem.accrued += accrual.data.sum.asFloat();

                            totalManagerAccrued += taskItem.accrued;
                        }
                    }

                    if(taskItem.accrued !== 0) {
                        // Период (задания)
                        if (task.data.period_completed){
                            let task_period = await task.data.period_completed.fetch();

                            taskItem.period = task_period.data.__name;
                        }

                        // Проект (Задания)
                        if (task.data.project){
                            let task_project = await task.data.project.fetch();

                            taskItem.project = task_project.data.__name;
                        }

                        totalManagerHours += taskItem.hours;
                        totalManagerPrice += taskItem.price;

                        managerItem.tasks.push(taskItem);
                    }
                }
            }

            managerItem.hours = totalManagerHours;
            managerItem.price = totalManagerPrice;
            managerItem.accrued = totalManagerAccrued;

            managersList.push(managerItem);
        }
    }
}

// Убрать знаки после запятой
function convertToFixed(item: number) {
    return Number(item.toFixed(1));
}

// Конвертация месяца в число
function monthToNumber(month: string): number {
    const monthNames = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];

    return monthNames.indexOf(month.split(" ")[0]) + 1;
}

// Сравнение дат
function comparePeriods(period1: string, period2: string): string {
    const [month1, year1] = period1.split(" ");
    const [month2, year2] = period2.split(" ");

    const date1 = new Date(parseInt(year1), monthToNumber(month1));
    const date2 = new Date(parseInt(year2), monthToNumber(month2));

    return date1 > date2 ? period1 : period2;
}

// Парсинг даты
function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split(' ').map(Number);

    return new Date(year, month - 1, day);
}

// Разница в днях
function differenceInDays(date1Str: string, date2Str: string): number {
    const date1 = parseDate(date1Str);
    const date2 = parseDate(date2Str);

    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return dayDiff;
}

// Форматирование даты в строку
function formatDateString(date: { day: number, month: number, year: number }): string {
    return `${date.day} ${date.month} ${date.year}`;
}

// Фильтр
const filteredProjects = projectList;
const filteredClients = clientsList;
const filteredSpecialists = specialistsList;
const filteredManagers = managersList;

async function filter(): Promise<void> {
    if(Context.data.department && Context.data.period)  {
        const inputDepartment = await Context.data.department.fetch();
        const inputPeriod = await Context.data.period.fetch();

        const departmentId = inputDepartment.data.__id;
        const periodName = inputPeriod.data.__name;


        projectList = filteredProjects
            .filter((project) => project.otdelID === departmentId)
            .filter((project) => project.projectTasks && project.projectTasks.some(projectTask => projectTask.period === periodName));

        clientsList = filteredClients
            .filter((client) => client.tickets && client.tickets.some(ticket => ticket.otdelID === departmentId))
            .filter((client) => client.tickets && client.tickets.some(ticket => ticket.period === periodName));

        specialistsList = filteredSpecialists
            .filter((specialist) => specialist.tasks && specialist.tasks.some(task => task.otdelID === departmentId))
            .filter((specialist) => specialist.tasks && specialist.tasks.some(task => task.period === periodName));

        managersList = filteredManagers
            .filter((manager) => manager.tasks && manager.tasks.some(task => task.otdelID === departmentId))
            .filter((manager) => manager.tasks && manager.tasks.some(task => task.period === periodName));

        ViewContext.data.timestamp = new Datetime();
    }
}


// Общая функция показа подробной информации
function showDetails<T extends { ID: string; showDetails: boolean }>(list: T[], id: string) {
    const item = list.find(item => item.ID === id);

    if (!item) {
        return;
    }

    item.showDetails = !item.showDetails;

    ViewContext.data.timestamp = new Datetime();
}

// Показ подробной информации проекта
function projectShowDetails(projectID: string) {
    showDetails(projectList, projectID);
}

// Показ подробной информации клиента
function clientShowDetails(clientID: string) {
    showDetails(clientsList, clientID);
}

// Показ подробной информации специалиста
function specialistShowDetails(specialistID: string) {
    showDetails(specialistsList, specialistID);
}

// Показ подробной информации менеджера
function managerShowDetails(managerID: string) {
    showDetails(managersList, managerID);
}
