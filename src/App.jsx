import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:8081";

const initialLoginData = { username: "", password: "" };
const initialAdminUserForm = {
  username: "",
  password: "",
  roleName: "Student",
  fullName: "",
  email: "",
  phone: "",
  groupId: "",
  courseNum: "",
  subjectId: "",
  teacherGroupId: "",
};
const initialScheduleForm = {
  weekDay: "",
  isDenominator: false,
  periodNum: "",
  groupId: "",
  subjectId: "",
  typeId: "",
  roomNum: "",
  teacherId: "",
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeScheduleRow(row) {
  if (Array.isArray(row)) {
    return {
      id: row[0],
      weekDay: row[1],
      isDenominator: !!row[2],
      periodNum: row[3],
      startTime: row[4],
      endTime: row[5],
      groupName: row[6],
      subjectName: row[7],
      lessonTypeName: row[8],
      roomNum: row[9],
      teacherName: row[10],
    };
  }

  return {
    id: row.id ?? row.ID,
    weekDay: row.weekDay ?? row.WeekDay,
    isDenominator: !!(row.isDenominator ?? row.IsDenominator),
    periodNum: row.periodNum ?? row.PeriodNum,
    startTime: row.startTime ?? row.StartTime,
    endTime: row.endTime ?? row.EndTime,
    groupName: row.groupName ?? row.GroupName,
    subjectName: row.subjectName ?? row.SubjectName,
    lessonTypeName: row.lessonTypeName ?? row.LessonTypeName,
    roomNum: row.roomNum ?? row.RoomNum,
    teacherName: row.teacherName ?? row.TeacherName,
  };
}

function normalizeTeacherAssignment(row) {
  if (Array.isArray(row)) {
    return {
      assignmentId: row[0],
      teacherId: row[1],
      teacherName: row[2],
      subjectId: row[3],
      subjectName: row[4],
      groupId: row[5],
      groupName: row[6],
      courseNum: row[7],
    };
  }

  return {
    assignmentId: row.assignmentId ?? row.AssignmentID,
    teacherId: row.teacherId ?? row.TeacherID,
    teacherName: row.teacherName ?? row.FullName,
    subjectId: row.subjectId ?? row.SubjectID,
    subjectName: row.subjectName ?? row.SubjectName,
    groupId: row.groupId ?? row.GroupID,
    groupName: row.groupName ?? row.GroupName,
    courseNum: row.courseNum ?? row.CourseNum,
  };
}

function normalizeTeacherStudent(row) {
  if (Array.isArray(row)) {
    return {
      studentId: row[0],
      fullName: row[1],
      groupId: row[2],
      groupName: row[3],
      courseNum: row[4],
      email: row[5],
      phone: row[6],
    };
  }

  return {
    studentId: row.studentId ?? row.StudentID,
    fullName: row.fullName ?? row.FullName,
    groupId: row.groupId ?? row.GroupID,
    groupName: row.groupName ?? row.GroupName,
    courseNum: row.courseNum ?? row.CourseNum,
    email: row.email ?? row.Email,
    phone: row.phone ?? row.Phone,
  };
}

function normalizeStudentGrade(row) {
  if (Array.isArray(row)) {
    return {
      gradeId: row[0],
      studentId: row[1],
      subjectName: row[2],
      teacherName: row[3],
      gradeValue: row[4],
      letterGrade: row[5],
      gradeDate: row[6],
    };
  }

  return {
    gradeId: row.gradeId ?? row.GradeID,
    studentId: row.studentId ?? row.StudentID,
    subjectName: row.subjectName ?? row.SubjectName,
    teacherName: row.teacherName ?? row.TeacherName,
    gradeValue: row.gradeValue ?? row.GradeValue,
    letterGrade: row.letterGrade ?? row.LetterGrade,
    gradeDate: row.gradeDate ?? row.GradeDate,
  };
}

function valueFromAny(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return "";
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue).slice(0, 10);
  return date.toLocaleDateString();
}

function App() {
  const [activePage, setActivePage] = useState("home");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "light",
  );
  const [lang, setLang] = useState(() => ["ru", "en", "zh"].includes(localStorage.getItem("lang")) ? localStorage.getItem("lang") : "ru");
  const [compactMode, setCompactMode] = useState(
    () => localStorage.getItem("compactMode") === "true",
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState("");
  const [globalMessage, setGlobalMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState(initialLoginData);

  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState({
    departments: 0,
    groups: 0,
    teachers: 0,
    students: 0,
    subjects: 0,
    schedule: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [maskedTeachers, setMaskedTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [maskedStudents, setMaskedStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [lessonPeriods, setLessonPeriods] = useState([]);
  const [lessonTypes, setLessonTypes] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [roomOccupancy, setRoomOccupancy] = useState([]);
  const [teacherOccupancy, setTeacherOccupancy] = useState([]);
  const [groupOccupancy, setGroupOccupancy] = useState([]);

  const [dayFilter, setDayFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);

  const [adminUserForm, setAdminUserForm] = useState(initialAdminUserForm);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [teacherGrades, setTeacherGrades] = useState({});
  const [studentGrades, setStudentGrades] = useState([]);
  const [backupResults, setBackupResults] = useState([]);

  const [backupProgress, setBackupProgress] = useState(0);
  const [backupRunning, setBackupRunning] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreRunning, setRestoreRunning] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedDictionaryTab, setSelectedDictionaryTab] =
    useState("departments");
  const [selectedOccupancyTab, setSelectedOccupancyTab] =
    useState("classrooms");
  const [selectedSqlObjectType, setSelectedSqlObjectType] = useState("all");
  const [sqlObjects, setSqlObjects] = useState([]);
  const [sqlCommand, setSqlCommand] = useState("SELECT TOP 20 * FROM vw_FullSchedule;");
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState("");
  const [showFullTeachers, setShowFullTeachers] = useState(false);

  const fileInputRef = useRef(null);

  const t = useMemo(() => {
    const ru = {
      loginTitle: "Вход в систему",
      login: "Вход",
      username: "Логин",
      password: "Пароль",
      signIn: "Войти",
      home: "Главная",
      schedule: "Расписание",
      grades: "Оценки",
      users: "Пользователи",
      transfer: "Экспорт / Импорт",
      backup: "Бэкапы",
      dictionaries: "Справочники",
      occupancy: "Занятость",
      sqlTerminal: "SQL Terminal",
      profile: "Профиль",
      logout: "Выйти",
      notifications: "Уведомления",
      settings: "Настройки",
      dashboard: "Рабочий стол",
      stats: "Статистика",
      nearestLessons: "Ближайшие занятия",
      systemStatus: "Статус системы",
      addLesson: "Добавить занятие",
      hideForm: "Скрыть форму",
      editLesson: "Редактирование занятия",
      createLesson: "Добавление занятия",
      save: "Сохранить",
      saveChanges: "Сохранить изменения",
      delete: "Удалить",
      edit: "Редактировать",
      role: "Роль",
      group: "Группа",
      subject: "Предмет",
      type: "Тип",
      teacher: "Преподаватель",
      room: "Аудитория",
      pair: "Пара",
      day: "День",
      allDays: "Все дни",
      searchGroup: "Поиск по группе",
      numerator: "Числитель",
      denominator: "Знаменатель",
      noData: "Нет данных",
      scheduleRecords: "Записей расписания",
      departments: "Кафедры",
      groups: "Группы",
      teachers: "Преподаватели",
      subjects: "Предметы",
      periods: "Пары",
      lessonTypes: "Типы занятий",
      classrooms: "Аудитории",
      maskedTeachers: "Маскированные данные преподавателей",
      studentsInfo: "Информация учеников",
      roomOccupancy: "Занятость аудиторий",
      teacherOccupancy: "Занятость преподавателей",
      groupOccupancy: "Занятость групп",
      addUsers: "Добавление пользователей",
      student: "Студент",
      fullName: "ФИО",
      email: "Email",
      phone: "Телефон",
      course: "Курс",
      addUser: "Добавить пользователя",
      myAssignments: "Мои назначения",
      studentsAndGrades: "Студенты и оценки",
      chooseAssignment: "Выбери назначение",
      score: "Балл",
      letter: "Буква",
      action: "Действие",
      myGrades: "Мои оценки",
      average: "Средний балл",
      export: "Экспорт",
      import: "Импорт",
      fullBackup: "Полный backup",
      diffBackup: "Дифференциальный backup",
      logBackup: "Лог backup",
      darkMode: "Тёмный режим",
      language: "Язык",
      compactMode: "Компактный режим",
      latestUpdates: "Обновления",
      notificationsEmpty: "Новых уведомлений нет",
      teachersMaskedHint: "Здесь берутся данные из /api/teachers/masked",
      dictionariesHint: "Справочники загружаются из новых backend endpoint'ов",
      backupHint: "Кнопки вызывают POST /api/backup/full, /diff и /log",
      scheduleHint:
        "Добавление и редактирование используют старые endpoint'ы /schedule",
      loginError: "Ошибка входа",
      serverUnavailable: "Сервер недоступен",
      lessonAdded: "Занятие добавлено",
      lessonUpdated: "Занятие обновлено",
      lessonDeleted: "Занятие удалено",
      chooseFile: "Выбери CSV файл",
      backupHistory: "Последние результаты backup",
      userCreated: "Пользователь добавлен",
      openSection: "Открыть раздел",
      quickAccess: "Быстрый доступ",
      coreModules: "Основные модули",
      occupancyOverview: "Сводка занятости",
      occupiedRooms: "Занятые аудитории",
      freeRooms: "Свободные аудитории",
      busyTeachers: "Занятые преподаватели",
      freeTeachers: "Свободные преподаватели",
      referenceNavigation: "Навигация по справочникам",
      realisticSystem: "Единая информационная панель университета",
    };

    const en = {
      loginTitle: "System login",
      login: "Login",
      username: "Username",
      password: "Password",
      signIn: "Sign in",
      home: "Home",
      schedule: "Schedule",
      grades: "Grades",
      users: "Users",
      transfer: "Export / Import",
      backup: "Backups",
      dictionaries: "Dictionaries",
      occupancy: "Occupancy",
      sqlTerminal: "SQL Terminal",
      profile: "Profile",
      logout: "Logout",
      notifications: "Notifications",
      settings: "Settings",
      dashboard: "Dashboard",
      stats: "Statistics",
      nearestLessons: "Upcoming lessons",
      systemStatus: "System status",
      addLesson: "Add lesson",
      hideForm: "Hide form",
      editLesson: "Edit lesson",
      createLesson: "Create lesson",
      save: "Save",
      saveChanges: "Save changes",
      delete: "Delete",
      edit: "Edit",
      role: "Role",
      group: "Group",
      subject: "Subject",
      type: "Type",
      teacher: "Teacher",
      room: "Room",
      pair: "Lesson",
      day: "Day",
      allDays: "All days",
      searchGroup: "Search group",
      numerator: "Numerator",
      denominator: "Denominator",
      noData: "No data",
      scheduleRecords: "Schedule records",
      departments: "Departments",
      groups: "Groups",
      teachers: "Teachers",
      subjects: "Subjects",
      periods: "Periods",
      lessonTypes: "Lesson types",
      classrooms: "Classrooms",
      maskedTeachers: "Masked teacher data",
      studentsInfo: "Student information",
      roomOccupancy: "Room occupancy",
      teacherOccupancy: "Teacher occupancy",
      groupOccupancy: "Group occupancy",
      addUsers: "Add users",
      student: "Student",
      fullName: "Full name",
      email: "Email",
      phone: "Phone",
      course: "Course",
      addUser: "Add user",
      myAssignments: "My assignments",
      studentsAndGrades: "Students and grades",
      chooseAssignment: "Choose assignment",
      score: "Score",
      letter: "Letter",
      action: "Action",
      myGrades: "My grades",
      average: "Average grade",
      export: "Export",
      import: "Import",
      fullBackup: "Full backup",
      diffBackup: "Differential backup",
      logBackup: "Log backup",
      darkMode: "Dark mode",
      language: "Language",
      compactMode: "Compact mode",
      latestUpdates: "Updates",
      notificationsEmpty: "No notifications",
      teachersMaskedHint: "This section uses /api/teachers/masked",
      dictionariesHint:
        "Dictionaries are loaded from the new backend endpoints",
      backupHint: "Buttons call POST /api/backup/full, /diff and /log",
      scheduleHint: "Create and update still use the old /schedule endpoints",
      loginError: "Login error",
      serverUnavailable: "Server unavailable",
      lessonAdded: "Lesson added",
      lessonUpdated: "Lesson updated",
      lessonDeleted: "Lesson deleted",
      chooseFile: "Choose CSV file",
      backupHistory: "Recent backup results",
      userCreated: "User created",
      openSection: "Open section",
      quickAccess: "Quick access",
      coreModules: "Core modules",
      occupancyOverview: "Occupancy overview",
      occupiedRooms: "Occupied rooms",
      freeRooms: "Free rooms",
      busyTeachers: "Busy teachers",
      freeTeachers: "Available teachers",
      referenceNavigation: "Reference navigation",
      realisticSystem: "Unified university information panel",
    };

    const zh = {
      loginTitle: "系统登录",
      login: "登录",
      username: "用户名",
      password: "密码",
      signIn: "登录",
      home: "首页",
      schedule: "课程表",
      grades: "成绩",
      users: "用户",
      transfer: "导出 / 导入",
      backup: "备份",
      dictionaries: "参考目录",
      occupancy: "占用情况",
      sqlTerminal: "SQL 终端",
      profile: "个人资料",
      logout: "退出",
      notifications: "通知",
      settings: "设置",
      dashboard: "工作台",
      stats: "统计",
      nearestLessons: "即将开始的课程",
      systemStatus: "系统状态",
      addLesson: "添加课程",
      hideForm: "隐藏表单",
      editLesson: "编辑课程",
      createLesson: "新增课程",
      save: "保存",
      saveChanges: "保存更改",
      delete: "删除",
      edit: "编辑",
      role: "角色",
      group: "小组",
      subject: "科目",
      type: "类型",
      teacher: "教师",
      room: "教室",
      pair: "课时",
      day: "星期",
      allDays: "所有日期",
      searchGroup: "按小组搜索",
      numerator: "分子周",
      denominator: "分母周",
      noData: "暂无数据",
      scheduleRecords: "课程表记录",
      departments: "院系",
      groups: "小组",
      teachers: "教师",
      subjects: "科目",
      periods: "课时",
      lessonTypes: "课程类型",
      classrooms: "教室",
      maskedTeachers: "教师脱敏数据",
      studentsInfo: "学生信息",
      roomOccupancy: "教室占用",
      teacherOccupancy: "教师占用",
      groupOccupancy: "小组占用",
      addUsers: "添加用户",
      student: "学生",
      fullName: "姓名",
      email: "邮箱",
      phone: "电话",
      course: "年级",
      addUser: "添加用户",
      myAssignments: "我的分配",
      studentsAndGrades: "学生与成绩",
      chooseAssignment: "选择分配",
      score: "分数",
      letter: "等级",
      action: "操作",
      myGrades: "我的成绩",
      average: "平均分",
      export: "导出",
      import: "导入",
      fullBackup: "完整备份",
      diffBackup: "差异备份",
      logBackup: "日志备份",
      darkMode: "深色模式",
      language: "语言",
      compactMode: "紧凑模式",
      latestUpdates: "更新",
      notificationsEmpty: "没有新通知",
      teachersMaskedHint: "此部分使用 /api/teachers/masked",
      dictionariesHint: "参考目录从新的 backend endpoint 加载",
      backupHint: "按钮调用 POST /api/backup/full、/diff 和 /log",
      scheduleHint: "添加和编辑仍使用旧 endpoint /schedule",
      loginError: "登录错误",
      serverUnavailable: "服务器不可用",
      lessonAdded: "课程已添加",
      lessonUpdated: "课程已更新",
      lessonDeleted: "课程已删除",
      chooseFile: "选择 CSV 文件",
      backupHistory: "最近备份结果",
      userCreated: "用户已添加",
      openSection: "打开模块",
      quickAccess: "快速访问",
      coreModules: "核心模块",
      occupancyOverview: "占用概览",
      occupiedRooms: "已占用教室",
      freeRooms: "空闲教室",
      busyTeachers: "忙碌教师",
      freeTeachers: "空闲教师",
      referenceNavigation: "参考目录导航",
      realisticSystem: "统一大学信息面板",
    };

    return lang === "ru" ? ru : lang === "zh" ? zh : en;
  }, [lang]);

  const days = useMemo(
    () => ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    [],
  );

  const pageTitleMap = useMemo(
    () => ({
      home: t.dashboard,
      schedule: t.schedule,
      grades: t.grades,
      users: t.users,
      transfer: t.transfer,
      backup: t.backup,
      dictionaries: t.dictionaries,
      occupancy: t.occupancy,
      sqlTerminal: t.sqlTerminal,
      profile: t.profile,
    }),
    [t],
  );

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    document.body.classList.toggle("compact-mode", compactMode);
    localStorage.setItem("theme", theme);
    localStorage.setItem("lang", lang);
    localStorage.setItem("compactMode", String(compactMode));
  }, [theme, lang, compactMode]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "ngrok-skip-browser-warning": "true",
        ...(options.headers || {}),
      },
    });
    let data = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else if (!contentType.includes("text/csv")) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return data;
  }

  async function loadSqlObjects(type = selectedSqlObjectType) {
    if (user?.roleName !== "Admin") return;

    setSqlLoading(true);
    setSqlError("");
    try {
      const data = await fetchJson(`${API}/api/sql/objects?type=${type}`);
      setSqlObjects(safeArray(data));
    } catch (err) {
      console.error(err);
      setSqlObjects([]);
      setSqlError(
        lang === "ru"
          ? `Backend endpoint /api/sql/objects не отвечает: ${err.message}`
          : `Backend endpoint /api/sql/objects is not responding: ${err.message}`,
      );
    } finally {
      setSqlLoading(false);
    }
  }

  function normalizeSqlResult(data) {
    if (!data) return { columns: [], rows: [] };

    if (Array.isArray(data)) {
      const columns = data[0] && typeof data[0] === "object" ? Object.keys(data[0]) : ["value"];
      const rows = data.map((row) =>
        columns.map((column) =>
          row && typeof row === "object" ? row[column] : row,
        ),
      );
      return { columns, rows };
    }

    if (Array.isArray(data.columns) && Array.isArray(data.rows)) {
      return data;
    }

    if (Array.isArray(data.result)) {
      return normalizeSqlResult(data.result);
    }

    const columns = Object.keys(data);
    return { columns, rows: [columns.map((column) => data[column])] };
  }

  async function handleSqlCommandSubmit(event) {
    event.preventDefault();
    if (!sqlCommand.trim()) return;

    setSqlLoading(true);
    setSqlError("");
    setSqlResult(null);
    try {
      const data = await fetchJson(`${API}/api/sql/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlCommand }),
      });
      setSqlResult(normalizeSqlResult(data));
      await loadSqlObjects(selectedSqlObjectType);
    } catch (err) {
      console.error(err);
      setSqlError(err.message);
    } finally {
      setSqlLoading(false);
    }
  }

  async function loadBootstrapData() {
    setLoading(true);
    try {
      const [
        scheduleData,
        statsData,
        departmentsData,
        groupsData,
        teachersData,
        maskedTeachersData,
        studentsData,
        maskedStudentsData,
        subjectsData,
        lessonPeriodsData,
        lessonTypesData,
        classroomsData,
        roomOccupancyData,
        teacherOccupancyData,
        groupOccupancyData,
      ] = await Promise.all([
        fetchJson(`${API}/schedule`).catch(() => []),
        fetchJson(`${API}/api/dashboard/stats`).catch(() => stats),
        fetchJson(`${API}/api/departments`).catch(() => []),
        fetchJson(`${API}/api/groups`).catch(() => []),
        fetchJson(`${API}/api/teachers`).catch(() => []),
        fetchJson(`${API}/api/teachers/masked`).catch(() => []),
        fetchJson(`${API}/api/students`).catch(() => []),
        fetchJson(`${API}/api/students/masked`).catch(() => []),
        fetchJson(`${API}/api/subjects`).catch(() => []),
        fetchJson(`${API}/api/lesson-periods`).catch(() => []),
        fetchJson(`${API}/api/lesson-types`).catch(() => []),
        fetchJson(`${API}/api/classrooms`).catch(() => []),
        fetchJson(`${API}/api/occupancy/classrooms`).catch(() => []),
        fetchJson(`${API}/api/occupancy/teachers`).catch(() => []),
        fetchJson(`${API}/api/occupancy/groups`).catch(() => []),
      ]);

      setSchedule(safeArray(scheduleData).map(normalizeScheduleRow));
      setStats(statsData || {});
      setDepartments(safeArray(departmentsData));
      setGroups(safeArray(groupsData));
      setTeachers(safeArray(teachersData));
      setMaskedTeachers(safeArray(maskedTeachersData));
      setStudents(safeArray(studentsData));
      setMaskedStudents(safeArray(maskedStudentsData));
      setSubjects(safeArray(subjectsData));
      setLessonPeriods(safeArray(lessonPeriodsData));
      setLessonTypes(safeArray(lessonTypesData));
      setClassrooms(safeArray(classroomsData));
      setRoomOccupancy(safeArray(roomOccupancyData));
      setTeacherOccupancy(safeArray(teacherOccupancyData));
      setGroupOccupancy(safeArray(groupOccupancyData));
    } catch (err) {
      console.error(err);
      setGlobalMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTeacherAssignments() {
    if (!user?.teacherId) return;
    try {
      const data = await fetchJson(
        `${API}/grades/teacher/assignments/${user.teacherId}`,
      );
      setTeacherAssignments(safeArray(data).map(normalizeTeacherAssignment));
    } catch (err) {
      console.error(err);
      setGlobalMessage(err.message);
    }
  }

  async function loadStudentsByGroup(groupId) {
    try {
      const data = await fetchJson(`${API}/grades/teacher/students/${groupId}`);
      setTeacherStudents(safeArray(data).map(normalizeTeacherStudent));
    } catch (err) {
      console.error(err);
      setGlobalMessage(err.message);
    }
  }

  async function loadStudentGrades() {
    if (!user?.studentId) return;
    try {
      const data = await fetchJson(`${API}/grades/student/${user.studentId}`);
      setStudentGrades(safeArray(data).map(normalizeStudentGrade));
    } catch (err) {
      console.error(err);
      setGlobalMessage(err.message);
    }
  }

  useEffect(() => {
    loadBootstrapData();
  }, []);

  useEffect(() => {
    if (user?.roleName === "Teacher") loadTeacherAssignments();
    if (user?.roleName === "Student") loadStudentGrades();
  }, [user]);

  useEffect(() => {
    if (activePage === "sqlTerminal" && user?.roleName === "Admin") {
      loadSqlObjects(selectedSqlObjectType);
    }
  }, [activePage, selectedSqlObjectType, user]);

  const groupOptions = useMemo(
    () =>
      groups.map((item) => ({
        id: valueFromAny(item, ["GroupID", "groupID", "groupId"]),
        name: valueFromAny(item, ["Name", "name"]),
      })),
    [groups],
  );

  const subjectOptions = useMemo(
    () =>
      subjects.map((item) => ({
        id: valueFromAny(item, ["SubjectID", "subjectId"]),
        name: valueFromAny(item, ["Name", "name"]),
      })),
    [subjects],
  );

  const teacherOptions = useMemo(
    () =>
      teachers.map((item) => ({
        id: valueFromAny(item, ["TeacherID", "teacherId"]),
        name: valueFromAny(item, ["FullName", "fullName"]),
      })),
    [teachers],
  );

  const typeOptions = useMemo(
    () =>
      lessonTypes.map((item) => ({
        id: valueFromAny(item, ["TypeID", "typeId"]),
        name: valueFromAny(item, ["Name", "name"]),
      })),
    [lessonTypes],
  );

  const periodOptions = useMemo(
    () =>
      lessonPeriods.map((item) => ({
        id: valueFromAny(item, ["PeriodNum", "periodNum"]),
        startTime: valueFromAny(item, ["StartTime", "startTime"]),
        endTime: valueFromAny(item, ["EndTime", "endTime"]),
      })),
    [lessonPeriods],
  );

  const classroomOptions = useMemo(
    () =>
      classrooms.map((item) => ({
        id: valueFromAny(item, ["RoomNum", "roomNum"]),
        label: `${valueFromAny(item, ["RoomNum", "roomNum"])}${valueFromAny(item, ["LessonTypeName", "lessonTypeName"]) ? ` • ${valueFromAny(item, ["LessonTypeName", "lessonTypeName"])}` : ""}`,
      })),
    [classrooms],
  );

  const roomBusyCount = useMemo(
    () =>
      roomOccupancy.filter((item) =>
        Boolean(valueFromAny(item, ["IsBusy", "isBusy"])),
      ).length,
    [roomOccupancy],
  );

  const roomFreeCount = useMemo(
    () => Math.max(roomOccupancy.length - roomBusyCount, 0),
    [roomOccupancy, roomBusyCount],
  );

  const teacherBusyCount = useMemo(
    () =>
      teacherOccupancy.filter((item) =>
        Boolean(valueFromAny(item, ["IsBusy", "isBusy"])),
      ).length,
    [teacherOccupancy],
  );

  const teacherFreeCount = useMemo(
    () => Math.max(teacherOccupancy.length - teacherBusyCount, 0),
    [teacherOccupancy, teacherBusyCount],
  );

  const dictionarySections = useMemo(
    () => [
      {
        key: "departments",
        title: t.departments,
        count: departments.length,
      },
      {
        key: "groups",
        title: t.groups,
        count: groups.length,
      },
      {
        key: "teachers",
        title: t.teachers,
        count: teachers.length,
      },
      {
        key: "students",
        title: t.studentsInfo,
        count: students.length,
      },
      {
        key: "subjects",
        title: t.subjects,
        count: subjects.length,
      },
      {
        key: "lessonTypes",
        title: t.lessonTypes,
        count: lessonTypes.length,
      },
      {
        key: "periods",
        title: t.periods,
        count: lessonPeriods.length,
      },
      {
        key: "classrooms",
        title: t.classrooms,
        count: classrooms.length,
      },
    ],
    [
      t,
      departments.length,
      groups.length,
      teachers.length,
      students.length,
      subjects.length,
      lessonTypes.length,
      lessonPeriods.length,
      classrooms.length,
    ],
  );

  const currentStudentGroupName = useMemo(() => {
    if (!user?.studentId && !user?.groupId) return "";

    const studentRow = students.find(
      (item) =>
        String(valueFromAny(item, ["StudentID", "studentId", "Id", "id"])) ===
        String(user.studentId),
    );

    const groupId =
      user.groupId ||
      valueFromAny(studentRow, ["GroupID", "groupID", "groupId", "GroupId"]);

    const groupRow = groups.find(
      (item) =>
        String(valueFromAny(item, ["GroupID", "groupID", "groupId", "GroupId"])) ===
        String(groupId),
    );

    return (
      user.groupName ||
      valueFromAny(studentRow, ["GroupName", "groupName"]) ||
      valueFromAny(groupRow, ["Name", "name"]) ||
      ""
    );
  }, [user, students, groups]);

  const currentTeacherName = useMemo(() => {
    if (!user?.teacherId) return user?.fullName || "";

    const teacherRow = teachers.find(
      (item) =>
        String(valueFromAny(item, ["TeacherID", "teacherId", "Id", "id"])) ===
        String(user.teacherId),
    );

    return (
      user.teacherName ||
      user.fullName ||
      valueFromAny(teacherRow, ["FullName", "fullName", "Name", "name"]) ||
      ""
    );
  }, [user, teachers]);

  const filteredSchedule = useMemo(
    () =>
      schedule.filter((item) => {
        const dayOk = !dayFilter || item.weekDay === dayFilter;
        const groupSearchOk =
          !groupFilter ||
          String(item.groupName || "")
            .toLowerCase()
            .includes(groupFilter.toLowerCase());

        const studentOwnScheduleOk =
          user?.roleName !== "Student" ||
          !currentStudentGroupName ||
          String(item.groupName || "").toLowerCase() ===
            String(currentStudentGroupName).toLowerCase();

        const teacherOwnScheduleOk =
          user?.roleName !== "Teacher" ||
          !currentTeacherName ||
          String(item.teacherName || "").toLowerCase() ===
            String(currentTeacherName).toLowerCase();

        return dayOk && groupSearchOk && studentOwnScheduleOk && teacherOwnScheduleOk;
      }),
    [schedule, dayFilter, groupFilter, user, currentStudentGroupName, currentTeacherName],
  );

  const averageStudentGrade = useMemo(() => {
    if (!studentGrades.length) return 0;
    const sum = studentGrades.reduce(
      (acc, item) => acc + Number(item.gradeValue || 0),
      0,
    );
    return Math.round(sum / studentGrades.length);
  }, [studentGrades]);

  const notifications = useMemo(() => {
    const items = [];
    if (globalMessage)
      items.push({ id: "global", title: "System", text: globalMessage });
    if (studentGrades[0]) {
      items.push({
        id: `grade-${studentGrades[0].gradeId}`,
        title: lang === "ru" ? "Новая оценка" : "New grade",
        text: `${studentGrades[0].subjectName}: ${studentGrades[0].gradeValue} (${studentGrades[0].letterGrade})`,
      });
    }
    if (schedule[0]) {
      items.push({
        id: `schedule-${schedule[0].id}`,
        title: lang === "ru" ? "Расписание" : "Schedule",
        text: `${schedule[0].subjectName} • ${schedule[0].weekDay} • ${schedule[0].startTime}`,
      });
    }
    return items;
  }, [globalMessage, studentGrades, schedule, lang]);

  function openContextMenu(event, payload) {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      ...payload,
    });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await fetchJson(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
    } catch (err) {
      console.error(err);
      setError(err.message || t.loginError);
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error(err);
      setGlobalMessage(
        lang === "ru"
          ? "Браузер не разрешил fullscreen режим"
          : "Browser blocked fullscreen mode",
      );
    }
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem("user");
    setLoginData(initialLoginData);
    setTeacherAssignments([]);
    setTeacherStudents([]);
    setTeacherGrades({});
    setStudentGrades([]);
    setSelectedAssignment("");
    setShowNotifications(false);
    setShowSettings(false);
    setActivePage("home");
  }

  async function handleAddOrUpdateSchedule(event) {
    event.preventDefault();
    try {
      const payload = {
        weekDay: scheduleForm.weekDay,
        isDenominator: scheduleForm.isDenominator,
        periodNum: Number(scheduleForm.periodNum),
        groupId: Number(scheduleForm.groupId),
        subjectId: Number(scheduleForm.subjectId),
        typeId: Number(scheduleForm.typeId),
        roomNum: Number(scheduleForm.roomNum),
        teacherId: Number(scheduleForm.teacherId),
      };

      await fetchJson(
        editId ? `${API}/schedule/${editId}` : `${API}/schedule`,
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      alert(editId ? t.lessonUpdated : t.lessonAdded);
      setScheduleForm(initialScheduleForm);
      setEditId(null);
      setShowAddForm(false);
      await loadBootstrapData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  function startEdit(lesson) {
    const group = groupOptions.find((item) => item.name === lesson.groupName);
    const subject = subjectOptions.find(
      (item) => item.name === lesson.subjectName,
    );
    const type = typeOptions.find(
      (item) => item.name === lesson.lessonTypeName,
    );
    const teacher = teacherOptions.find(
      (item) => item.name === lesson.teacherName,
    );

    setEditId(lesson.id);
    setShowAddForm(true);
    setActivePage("schedule");
    setScheduleForm({
      weekDay: lesson.weekDay || "",
      isDenominator: !!lesson.isDenominator,
      periodNum: String(lesson.periodNum || ""),
      groupId: String(group?.id || ""),
      subjectId: String(subject?.id || ""),
      typeId: String(type?.id || ""),
      roomNum: String(lesson.roomNum || ""),
      teacherId: String(teacher?.id || ""),
    });
  }

  async function handleDeleteSchedule(id) {
    if (!window.confirm(lang === "ru" ? "Удалить занятие?" : "Delete lesson?"))
      return;
    try {
      await fetchJson(`${API}/schedule/${id}`, { method: "DELETE" });
      alert(t.lessonDeleted);
      await loadBootstrapData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  async function handleExport() {
    try {
      const response = await fetch(`${API}/schedule/export`);
      if (!response.ok) throw new Error("Export error");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "schedule_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetchJson(`${API}/schedule/import`, {
        method: "POST",
        body: formData,
      });
      await loadBootstrapData();
      alert(lang === "ru" ? "Импорт завершен" : "Import completed");
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
    event.target.value = "";
  }

  async function handleAdminUserSubmit(event) {
    event.preventDefault();
    try {
      const payload = {
        username: adminUserForm.username,
        password: adminUserForm.password,
        roleName: adminUserForm.roleName,
        fullName: adminUserForm.fullName,
        email: adminUserForm.email,
        phone: adminUserForm.phone,
        groupId: adminUserForm.groupId ? Number(adminUserForm.groupId) : null,
        courseNum: adminUserForm.courseNum
          ? Number(adminUserForm.courseNum)
          : null,
        subjectId: adminUserForm.subjectId
          ? Number(adminUserForm.subjectId)
          : null,
        teacherGroupId: adminUserForm.teacherGroupId
          ? Number(adminUserForm.teacherGroupId)
          : null,
      };

      const result = await fetchJson(`${API}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert(result.message || t.userCreated);
      setAdminUserForm(initialAdminUserForm);
      await loadBootstrapData();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  async function handleTeacherSaveGrade(studentId) {
    const assignment = teacherAssignments.find(
      (item) => String(item.assignmentId) === String(selectedAssignment),
    );
    const gradeData = teacherGrades[studentId];
    if (!assignment) {
      alert(
        lang === "ru" ? "Сначала выбери назначение" : "Choose assignment first",
      );
      return;
    }
    if (!gradeData?.gradeValue || !gradeData?.letterGrade) {
      alert(lang === "ru" ? "Заполни балл и букву" : "Fill score and letter");
      return;
    }
    try {
      const result = await fetchJson(`${API}/grades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: Number(studentId),
          teacherId: Number(assignment.teacherId),
          subjectId: Number(assignment.subjectId),
          gradeValue: Number(gradeData.gradeValue),
          letterGrade: gradeData.letterGrade,
        }),
      });
      alert(result.message || "OK");
      setTeacherGrades((prev) => ({
        ...prev,
        [studentId]: { gradeValue: "", letterGrade: "" },
      }));
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  async function handleBackup(type) {
    if (backupRunning || restoreRunning) return;

    setBackupRunning(true);
    setBackupProgress(8);

    let current = 8;
    const timer = setInterval(() => {
      current = Math.min(current + Math.floor(Math.random() * 18) + 6, 92);
      setBackupProgress(current);
    }, 260);

    try {
      const result = await fetchJson(`${API}/api/backup/${type}`, {
        method: "POST",
      });
      setBackupProgress(100);

      setBackupResults((prev) =>
        [
          {
            ...result,
            id: `${type}-${Date.now()}`,
            type,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 6),
      );

      setTimeout(() => {
        setBackupProgress(0);
        setBackupRunning(false);
      }, 850);
    } catch (err) {
      console.error(err);
      setBackupProgress(0);
      setBackupRunning(false);
      alert(err.message);
    } finally {
      clearInterval(timer);
    }
  }

  async function handleRestore(kind) {
    if (backupRunning || restoreRunning) return;

    const restoreConfig = {
      full: {
        endpoint: "full",
        label: "Restore Full Backup",
        type: "restore-full",
        ruConfirm: "Восстановить базу из Full Backup? Текущие данные будут заменены.",
        enConfirm: "Restore database from Full Backup? Current data will be replaced.",
      },
      "full-diff": {
        endpoint: "full-diff",
        label: "Restore Full + Differential",
        type: "restore-full-diff",
        ruConfirm: "Восстановить базу по цепочке Full + Differential? Текущие данные будут заменены.",
        enConfirm: "Restore database using Full + Differential chain? Current data will be replaced.",
      },
      "full-diff-log": {
        endpoint: "full-diff-log",
        label: "Restore Full + Diff + Log",
        type: "restore-full-diff-log",
        ruConfirm: "Восстановить базу по полной цепочке Full + Differential + Log? Текущие данные будут заменены.",
        enConfirm: "Restore database using Full + Differential + Log chain? Current data will be replaced.",
      },
    };

    const config = restoreConfig[kind] || restoreConfig.full;
    const ok = window.confirm(lang === "ru" ? config.ruConfirm : config.enConfirm);
    if (!ok) return;

    setRestoreRunning(true);
    setRestoreProgress(6);

    let current = 6;
    const timer = setInterval(() => {
      current = Math.min(current + Math.floor(Math.random() * 14) + 5, 90);
      setRestoreProgress(current);
    }, 300);

    try {
      const result = await fetchJson(`${API}/api/backup/restore/${config.endpoint}`, {
        method: "POST",
      });

      setRestoreProgress(100);
      setBackupResults((prev) =>
        [
          {
            ...result,
            id: `${config.type}-${Date.now()}`,
            type: config.type,
            label: config.label,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 8),
      );

      alert(result.message || `${config.label} выполнен`);

      setTimeout(() => {
        setRestoreProgress(0);
        setRestoreRunning(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      setRestoreProgress(0);
      setRestoreRunning(false);
      alert(err.message);
    } finally {
      clearInterval(timer);
    }
  }

  function renderTableCard(title, columns, rows, rowRenderer, extraClass = "") {
    return (
      <section className={`panel wide-panel ${extraClass}`}>
        <div className="panel-header">
          <h3>{title}</h3>
        </div>
        {!rows.length ? (
          <p>{t.noData}</p>
        ) : (
          <div className="table-box">
            <div
              className="table-head"
              style={{
                gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))`,
              }}
            >
              {columns.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
            {rows.map(rowRenderer)}
          </div>
        )}
      </section>
    );
  }

  function renderLogin() {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
          <h1 className="page-title">UNIVER</h1>
          <div className="auth-shell one-column-auth">
            <div className="auth-card small-card centered-card">
              <h2>{t.loginTitle}</h2>
              <form className="auth-form" onSubmit={handleLogin}>
                <label>{t.username}</label>
                <input
                  type="text"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder={t.username}
                />
                <label>{t.password}</label>
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder={t.password}
                />
                {error && <p className="error-text">{error}</p>}
                <button className="main-btn" type="submit">
                  {t.signIn}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderHome() {
    const news = [
      {
        id: "olympiad",
        title: lang === "ru" ? "Олимпиада по программированию" : "Programming Olympiad",
        date: "12 мая",
        text:
          lang === "ru"
            ? "В университете пройдет олимпиада по программированию. Регистрация открыта до 10 мая."
            : "The university programming olympiad will be held soon. Registration is open until May 10.",
      },
      {
        id: "schedule-update",
        title: lang === "ru" ? "Обновление расписания" : "Schedule update",
        date: "15 мая",
        text:
          lang === "ru"
            ? "В системе опубликованы актуальные изменения по расписанию занятий и экзаменов."
            : "The latest updates for classes and exams have been published in the system.",
      },
      {
        id: "conference",
        title: lang === "ru" ? "Научная конференция" : "Scientific conference",
        date: "25 мая",
        text:
          lang === "ru"
            ? "Студенты могут отправить статьи и заявки на участие в университетской конференции."
            : "Students can submit papers and applications for the university conference.",
      },
      {
        id: "library",
        title: lang === "ru" ? "Новые материалы в библиотеке" : "New library materials",
        date: "28 мая",
        text:
          lang === "ru"
            ? "Добавлены электронные материалы по базам данных, JavaScript и информационной безопасности."
            : "New electronic materials on databases, JavaScript and information security have been added.",
      },
    ];

    return (
      <section className="dashboard-home news-home">
        <div className="panel wide-panel news-panel">
          <div className="panel-header news-header">
            <div>
              <h2>{lang === "ru" ? "Новости университета" : "University news"}</h2>
              <p className="muted-text">
                {lang === "ru"
                  ? "Актуальные объявления, мероприятия и учебные новости."
                  : "Current announcements, events and academic news."}
              </p>
            </div>
            <span className="role-badge">
              {lang === "ru" ? "Информационный портал" : "Information portal"}
            </span>
          </div>

          <div className="news-grid">
            {news.map((item) => (
              <article className="news-card" key={item.id}>
                <div className="news-date">{item.date}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderSchedule() {
    return (
      <>
        <div className="filters-bar">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <option value="">{t.allDays}</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <input
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            placeholder={t.searchGroup}
          />
        </div>

        {user.roleName === "Admin" && (
          <div className="admin-actions">
            <button
              className="main-btn"
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? t.hideForm : t.addLesson}
            </button>
          </div>
        )}

        {user.roleName === "Admin" && showAddForm && (
          <div
            className="mac-modal-backdrop"
            onClick={() => setShowAddForm(false)}
          >
            <div
              className="mac-modal-window"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mac-window-controls">
                <button
                  type="button"
                  className="mac-dot red"
                  onClick={() => setShowAddForm(false)}
                ></button>
                <span className="mac-dot yellow"></span>
                <span className="mac-dot green"></span>
              </div>
              <form
                className="edit-panel modal-card"
                onSubmit={handleAddOrUpdateSchedule}
              >
                <h3>{editId ? t.editLesson : t.createLesson}</h3>
                <div className="edit-grid">
                  <select
                    value={scheduleForm.weekDay}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        weekDay: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.day}</option>
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.isDenominator ? "true" : "false"}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        isDenominator: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="false">{t.numerator}</option>
                    <option value="true">{t.denominator}</option>
                  </select>

                  <select
                    value={scheduleForm.periodNum}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        periodNum: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.pair}</option>
                    {periodOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.id} • {item.startTime} - {item.endTime}
                      </option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.groupId}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        groupId: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.group}</option>
                    {groupOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.subjectId}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        subjectId: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.subject}</option>
                    {subjectOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.typeId}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        typeId: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.type}</option>
                    {typeOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.roomNum}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        roomNum: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.room}</option>
                    {classroomOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={scheduleForm.teacherId}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        teacherId: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">{t.teacher}</option>
                    {teacherOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="main-btn" type="submit">
                  {editId ? t.saveChanges : t.save}
                </button>
              </form>
            </div>
          </div>
        )}

        <section className="panel wide-panel">
          <div className="panel-header">
            <h3>{t.schedule}</h3>
          </div>
          <div className="lesson-cards">
            {!filteredSchedule.length && <p>{t.noData}</p>}
            {filteredSchedule.map((lesson) => (
              <div
                className="lesson-card hover-preview-row"
                key={lesson.id}
                data-preview={`${lesson.subjectName} • ${lesson.groupName} • ${lesson.roomNum}`}
                onContextMenu={(e) =>
                  openContextMenu(e, {
                    title: lesson.subjectName,
                    subtitle: `${lesson.groupName} • ${lesson.teacherName}`,
                    kind: "lesson",
                    id: lesson.id,
                  })
                }
              >
                <div className="lesson-card-top">
                  <div>
                    <div className="lesson-subject">{lesson.subjectName}</div>
                    <div className="lesson-meta">
                      {lesson.weekDay} • {lesson.startTime} - {lesson.endTime}
                    </div>
                  </div>
                  <div className="room-badge">{lesson.roomNum}</div>
                </div>
                <div className="lesson-details">
                  <span>
                    <strong>{t.group}:</strong> {lesson.groupName}
                  </span>
                  <span>
                    <strong>{t.type}:</strong> {lesson.lessonTypeName}
                  </span>
                  <span>
                    <strong>{t.teacher}:</strong> {lesson.teacherName}
                  </span>
                  <span>
                    <strong>{t.pair}:</strong> {lesson.periodNum}
                  </span>
                  <span>
                    <strong>{lang === "ru" ? "Числ/знам" : "Num/Den"}:</strong>{" "}
                    {lesson.isDenominator ? t.denominator : t.numerator}
                  </span>
                </div>
                {user.roleName === "Admin" && (
                  <div className="lesson-actions">
                    <button
                      className="secondary-btn"
                      type="button"
                      onClick={() => startEdit(lesson)}
                    >
                      {t.edit}
                    </button>
                    <button
                      className="danger-btn"
                      type="button"
                      onClick={() => handleDeleteSchedule(lesson.id)}
                    >
                      {t.delete}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  function renderTeacherGrades() {
    const selected = teacherAssignments.find(
      (item) => String(item.assignmentId) === String(selectedAssignment),
    );

    const gradePresets = [
      { label: "A", value: 95 },
      { label: "B", value: 85 },
      { label: "C", value: 75 },
      { label: "D", value: 65 },
      { label: "F", value: 50 },
    ];

    return (
      <section className="grades-workspace">
        <div className="panel wide-panel grade-assignments-panel">
          <div className="panel-header">
            <div>
              <h3>{t.myAssignments}</h3>
              <p className="muted-text">
                {lang === "ru"
                  ? "Выбери предмет и группу, затем выставь оценки студентам карточками."
                  : "Choose a subject and group, then grade students with cards."}
              </p>
            </div>
          </div>

          <div className="assignment-card-grid">
            {!teacherAssignments.length && (
              <div className="simple-item">{t.noData}</div>
            )}

            {teacherAssignments.map((item) => (
              <button
                key={item.assignmentId}
                type="button"
                className={`assignment-card ${String(selectedAssignment) === String(item.assignmentId) ? "active" : ""}`}
                onClick={() => {
                  setSelectedAssignment(String(item.assignmentId));
                  loadStudentsByGroup(item.groupId);
                }}
              >
                <strong>{item.subjectName}</strong>
                <span>
                  {item.groupName} • {t.course} {item.courseNum}
                </span>
                <small>
                  {lang === "ru" ? "Открыть студентов" : "Open students"}
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel wide-panel grade-students-panel">
          <div className="panel-header">
            <div>
              <h3>{t.studentsAndGrades}</h3>
              {selected && (
                <p className="muted-text">
                  {selected.subjectName} • {selected.groupName} • {t.course}{" "}
                  {selected.courseNum}
                </p>
              )}
            </div>
            <div className="status-badge">
              {teacherStudents.length} {lang === "ru" ? "студ." : "students"}
            </div>
          </div>

          {!selectedAssignment ? (
            <div className="empty-state-card">
              <div className="empty-icon">⌘</div>
              <strong>
                {lang === "ru"
                  ? "Сначала выбери назначение"
                  : "Choose an assignment first"}
              </strong>
              <span>
                {lang === "ru"
                  ? "Список студентов появится здесь."
                  : "Students will appear here."}
              </span>
            </div>
          ) : !teacherStudents.length ? (
            <div className="empty-state-card">
              <div className="empty-icon">◌</div>
              <strong>{t.noData}</strong>
              <span>
                {lang === "ru"
                  ? "В этой группе пока нет студентов или backend вернул пустой список."
                  : "This group has no students or backend returned an empty list."}
              </span>
            </div>
          ) : (
            <div className="student-grade-cards">
              {teacherStudents.map((student) => {
                const draft = teacherGrades[student.studentId] || {
                  gradeValue: "",
                  letterGrade: "",
                };

                return (
                  <article
                    className="student-grade-card"
                    key={student.studentId}
                  >
                    <div className="student-grade-main">
                      <div className="student-avatar">
                        {(student.fullName || "?").slice(0, 1)}
                      </div>

                      <div>
                        <h4>{student.fullName}</h4>
                        <p>
                          {student.groupName} • {t.course} {student.courseNum}
                        </p>
                      </div>
                    </div>

                    <div className="grade-presets">
                      {gradePresets.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          className={`grade-chip ${String(draft.letterGrade).toUpperCase() === preset.label ? "active" : ""}`}
                          onClick={() =>
                            setTeacherGrades((prev) => ({
                              ...prev,
                              [student.studentId]: {
                                gradeValue: String(preset.value),
                                letterGrade: preset.label,
                              },
                            }))
                          }
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="grade-editor">
                      <label>
                        <span>{t.score}</span>
                        <input
                          className="grade-input"
                          type="number"
                          min="0"
                          max="100"
                          value={draft.gradeValue}
                          onChange={(e) =>
                            setTeacherGrades((prev) => ({
                              ...prev,
                              [student.studentId]: {
                                ...prev[student.studentId],
                                gradeValue: e.target.value,
                              },
                            }))
                          }
                        />
                      </label>

                      <label>
                        <span>{t.letter}</span>
                        <select
                          className="grade-input"
                          value={draft.letterGrade}
                          onChange={(e) =>
                            setTeacherGrades((prev) => ({
                              ...prev,
                              [student.studentId]: {
                                ...prev[student.studentId],
                                letterGrade: e.target.value,
                              },
                            }))
                          }
                        >
                          <option value="">-</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="F">F</option>
                        </select>
                      </label>

                      <button
                        className="main-btn save-grade-btn"
                        type="button"
                        onClick={() =>
                          handleTeacherSaveGrade(student.studentId)
                        }
                      >
                        {t.save}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderStudentGrades() {
    return (
      <section className="dashboard-grid">
        <div className="panel wide-panel">
          <div className="panel-header">
            <h3>{t.myGrades}</h3>
          </div>
          {!studentGrades.length ? (
            <p>{t.noData}</p>
          ) : (
            <div className="table-box">
              <div className="table-head student-grade-grid">
                <div>{t.subject}</div>
                <div>{t.teacher}</div>
                <div>{t.score}</div>
                <div>{t.letter}</div>
                <div>{t.day}</div>
              </div>
              {studentGrades.map((item) => (
                <div
                  className="table-row student-grade-grid"
                  key={item.gradeId}
                >
                  <div>{item.subjectName}</div>
                  <div>{item.teacherName}</div>
                  <div>{item.gradeValue}</div>
                  <div>{item.letterGrade}</div>
                  <div>{formatDate(item.gradeDate)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>{t.average}</h3>
          </div>
          <div className="stat-box">
            <div className="stat-number">{averageStudentGrade}</div>
            <div className="stat-label">{t.average}</div>
          </div>
        </div>
      </section>
    );
  }

  function renderGrades() {
    if (user.roleName === "Teacher") return renderTeacherGrades();
    if (user.roleName === "Student") return renderStudentGrades();
    return (
      <section className="panel wide-panel">
        <div className="panel-header">
          <h3>{t.grades}</h3>
        </div>
        <p>{t.noData}</p>
      </section>
    );
  }

  function renderUsers() {
    return (
      <section className="panel wide-panel">
        <div className="panel-header">
          <h3>{t.addUsers}</h3>
        </div>
        <form
          className="edit-panel users-form-panel"
          onSubmit={handleAdminUserSubmit}
        >
          <div className="edit-grid">
            <select
              value={adminUserForm.roleName}
              onChange={(e) =>
                setAdminUserForm((prev) => ({
                  ...prev,
                  roleName: e.target.value,
                }))
              }
            >
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
            </select>
            <input
              value={adminUserForm.username}
              onChange={(e) =>
                setAdminUserForm((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              placeholder={t.username}
              required
            />
            <input
              type="password"
              value={adminUserForm.password}
              onChange={(e) =>
                setAdminUserForm((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              placeholder={t.password}
              required
            />
            <input
              value={adminUserForm.fullName}
              onChange={(e) =>
                setAdminUserForm((prev) => ({
                  ...prev,
                  fullName: e.target.value,
                }))
              }
              placeholder={t.fullName}
              required
            />
            <input
              type="email"
              value={adminUserForm.email}
              onChange={(e) =>
                setAdminUserForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder={t.email}
              required
            />
            <input
              value={adminUserForm.phone}
              onChange={(e) =>
                setAdminUserForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder={t.phone}
              required
            />
            <input
              type="number"
              value={adminUserForm.courseNum}
              onChange={(e) =>
                setAdminUserForm((prev) => ({
                  ...prev,
                  courseNum: e.target.value,
                }))
              }
              placeholder={t.course}
              required
            />

            {adminUserForm.roleName === "Student" && (
              <select
                value={adminUserForm.groupId}
                onChange={(e) =>
                  setAdminUserForm((prev) => ({
                    ...prev,
                    groupId: e.target.value,
                  }))
                }
                required
              >
                <option value="">{t.group}</option>
                {groupOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}

            {adminUserForm.roleName === "Teacher" && (
              <>
                <select
                  value={adminUserForm.subjectId}
                  onChange={(e) =>
                    setAdminUserForm((prev) => ({
                      ...prev,
                      subjectId: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">{t.subject}</option>
                  {subjectOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={adminUserForm.teacherGroupId}
                  onChange={(e) =>
                    setAdminUserForm((prev) => ({
                      ...prev,
                      teacherGroupId: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">{t.group}</option>
                  {groupOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <button className="main-btn" type="submit">
            {t.addUser}
          </button>
        </form>
      </section>
    );
  }

  function renderTransfer() {
    return (
      <section className="panel wide-panel">
        <div className="panel-header">
          <h3>{t.transfer}</h3>
        </div>
        <div className="admin-actions">
          <button
            className="secondary-btn"
            type="button"
            onClick={handleExport}
          >
            {t.export}
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={handleImportClick}
          >
            {t.import}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
        </div>
        <div className="simple-list transfer-note">
          <div className="simple-item">{t.scheduleHint}</div>
          <div className="simple-item">CSV → /schedule/import</div>
        </div>
      </section>
    );
  }

  function renderBackup() {
    return (
      <section className="dashboard-grid">
        <div className="panel wide-panel">
          <div className="panel-header">
            <h3>{t.backup}</h3>
          </div>
          <div className="backup-command-grid">
            <div className="backup-command-card backup-create-card">
              <div>
                <h4>Backup</h4>
                <p className="muted-text">Создание резервных копий SQL Server</p>
              </div>
              <div className="admin-actions backup-button-row">
                <button
                  className="main-btn"
                  type="button"
                  disabled={backupRunning || restoreRunning}
                  onClick={() => handleBackup("full")}
                >
                  {t.fullBackup}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={backupRunning || restoreRunning}
                  onClick={() => handleBackup("diff")}
                >
                  {t.diffBackup}
                </button>
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={backupRunning || restoreRunning}
                  onClick={() => handleBackup("log")}
                >
                  {t.logBackup}
                </button>
              </div>
            </div>

            <div className="backup-command-card backup-restore-card">
              <div>
                <h4>Restore</h4>
                <p className="muted-text">Восстановление: SINGLE_USER → RESTORE → MULTI_USER</p>
              </div>
              <div className="admin-actions backup-button-row">
                <button
                  className="danger-btn restore-btn"
                  type="button"
                  disabled={backupRunning || restoreRunning}
                  onClick={() => handleRestore("full")}
                >
                  Restore Full
                </button>
                <button
                  className="danger-btn restore-btn"
                  type="button"
                  disabled={backupRunning || restoreRunning}
                  onClick={() => handleRestore("full-diff")}
                >
                  Restore Full + Diff
                </button>
                <button
                  className="danger-btn restore-btn"
                  type="button"
                  disabled={backupRunning || restoreRunning}
                  onClick={() => handleRestore("full-diff-log")}
                >
                  Restore Full + Diff + Log
                </button>
              </div>
            </div>
          </div>
          {backupRunning && (
            <div className="mac-progress-wrap">
              <div className="mac-progress-label">
                <span>Backup выполняется</span>
                <strong>{backupProgress}%</strong>
              </div>
              <div className="mac-progress-track">
                <div
                  className="mac-progress-fill"
                  style={{ width: `${backupProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {restoreRunning && (
            <div className="mac-progress-wrap restore-progress">
              <div className="mac-progress-label">
                <span>Restore выполняется</span>
                <strong>{restoreProgress}%</strong>
              </div>
              <div className="mac-progress-track">
                <div
                  className="mac-progress-fill restore-fill"
                  style={{ width: `${restoreProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <p className="muted-text">{t.backupHint}</p>
        </div>
        <div className="panel wide-panel">
          <div className="panel-header">
            <h3>{t.backupHistory}</h3>
          </div>
          <div className="simple-list">
            {!backupResults.length && (
              <div className="simple-item">{t.noData}</div>
            )}
            {backupResults.map((item) => (
              <div className={`simple-item backup-history-item ${item.success === false ? "backup-failed" : "backup-ok"}`} key={item.id}>
                <div className="backup-history-top">
                  <strong>{item.label || item.type || "backup"}</strong>
                  <span>{item.time}</span>
                </div>
                <div className="notification-text">{item.message}</div>
                {item.path && <div className="notification-text">{item.path}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  function renderDictionaries() {
    const activeDictionary = selectedDictionaryTab;

    return (
      <section className="dictionary-page">
        <div className="panel-header dictionary-page-header">
          <h3>{t.dictionaries}</h3>
        </div>

        <div className="dictionary-toolbar dictionary-top-tabs">
          {dictionarySections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={`dictionary-tab ${activeDictionary === section.key ? "active" : ""}`}
              onClick={() => setSelectedDictionaryTab(section.key)}
            >
              <span>{section.title}</span>
              <strong>{section.count}</strong>
            </button>
          ))}
        </div>

        {activeDictionary === "departments" &&
          renderTableCard(
            t.departments,
            ["ID", t.departments],
            departments,
            (row, idx) => (
              <div
                className="table-row"
                style={{ gridTemplateColumns: "120px 1fr" }}
                key={`dept-${idx}`}
              >
                <div>{valueFromAny(row, ["DeptID", "deptID", "deptId"])}</div>
                <div>{valueFromAny(row, ["Name", "name"])}</div>
              </div>
            ),
          )}

        {activeDictionary === "groups" &&
          renderTableCard(
            t.groups,
            ["ID", t.group, t.departments, lang === "ru" ? "Размер" : "Size"],
            groups,
            (row, idx) => (
              <div className="table-row four-col" key={`group-${idx}`}>
                <div>{valueFromAny(row, ["GroupID", "groupId"])}</div>
                <div>{valueFromAny(row, ["Name", "name"])}</div>
                <div>
                  {valueFromAny(row, [
                    "DepartmentName",
                    "departmentName",
                    "DeptID",
                    "deptId",
                  ])}
                </div>
                <div>{valueFromAny(row, ["Size", "size"])}</div>
              </div>
            ),
          )}

        {activeDictionary === "subjects" &&
          renderTableCard(
            t.subjects,
            ["ID", t.subject],
            subjects,
            (row, idx) => (
              <div
                className="table-row"
                style={{ gridTemplateColumns: "120px 1fr" }}
                key={`subject-${idx}`}
              >
                <div>{valueFromAny(row, ["SubjectID", "subjectId"])}</div>
                <div>{valueFromAny(row, ["Name", "name"])}</div>
              </div>
            ),
          )}

        {activeDictionary === "lessonTypes" &&
          renderTableCard(
            t.lessonTypes,
            ["ID", t.type],
            lessonTypes,
            (row, idx) => (
              <div
                className="table-row"
                style={{ gridTemplateColumns: "120px 1fr" }}
                key={`type-${idx}`}
              >
                <div>{valueFromAny(row, ["TypeID", "typeId"])}</div>
                <div>{valueFromAny(row, ["Name", "name"])}</div>
              </div>
            ),
          )}

        {activeDictionary === "periods" &&
          renderTableCard(
            t.periods,
            [
              t.pair,
              lang === "ru" ? "Начало" : "Start",
              lang === "ru" ? "Конец" : "End",
            ],
            lessonPeriods,
            (row, idx) => (
              <div className="table-row three-col" key={`period-${idx}`}>
                <div>{valueFromAny(row, ["PeriodNum", "periodNum"])}</div>
                <div>{valueFromAny(row, ["StartTime", "startTime"])}</div>
                <div>{valueFromAny(row, ["EndTime", "endTime"])}</div>
              </div>
            ),
          )}

        {activeDictionary === "classrooms" &&
          renderTableCard(
            t.classrooms,
            [t.room, t.type, lang === "ru" ? "Вместимость" : "Capacity"],
            classrooms,
            (row, idx) => (
              <div className="table-row three-col" key={`room-${idx}`}>
                <div>{valueFromAny(row, ["RoomNum", "roomNum"])}</div>
                <div>
                  {valueFromAny(row, [
                    "LessonTypeName",
                    "lessonTypeName",
                    "TypeID",
                    "typeId",
                  ])}
                </div>
                <div>{valueFromAny(row, ["Capacity", "capacity"])}</div>
              </div>
            ),
          )}

        {activeDictionary === "teachers" && (
          <section className="panel wide-panel ios-reveal-panel">
            <div className="panel-header ios-panel-header">
              <div>
                <h3>{t.maskedTeachers}</h3>
                <p className="muted-text">{t.teachersMaskedHint}</p>
              </div>

              {user.roleName === "Admin" && (
                <button
                  className={`secondary-btn eye-btn ${showFullTeachers ? "active" : ""}`}
                  type="button"
                  onClick={() => setShowFullTeachers((prev) => !prev)}
                  title={
                    showFullTeachers ? "Скрыть данные" : "Показать полностью"
                  }
                >
                  <span className="eye-icon">
                    {showFullTeachers ? "👁️" : "👁"}
                  </span>
                  <span>{showFullTeachers ? "Скрыть" : "Показать"}</span>
                </button>
              )}
            </div>

            <div className="table-box ios-table">
              <div className="table-head four-col">
                <div>ID</div>
                <div>{t.fullName}</div>
                <div>{t.phone}</div>
                <div>{t.email}</div>
              </div>

              {(showFullTeachers && user.roleName === "Admin"
                ? teachers
                : maskedTeachers
              ).map((row, idx) => (
                <div
                  className={`table-row four-col fade-row ${
                    showFullTeachers && user.roleName === "Admin"
                      ? "revealed-row"
                      : "masked-row"
                  }`}
                  key={`teacher-secure-${idx}`}
                  data-preview={`${valueFromAny(row, ["FullName", "fullName"])} • ${valueFromAny(row, ["PhoneMasked", "phoneMasked", "Phone", "phone"])}`}
                  onContextMenu={(e) =>
                    openContextMenu(e, {
                      title: valueFromAny(row, ["FullName", "fullName"]),
                      subtitle: valueFromAny(row, [
                        "EmailMasked",
                        "emailMasked",
                        "Email",
                        "email",
                      ]),
                      kind: "teacher",
                    })
                  }
                >
                  <div>{valueFromAny(row, ["TeacherID", "teacherId"])}</div>
                  <div>{valueFromAny(row, ["FullName", "fullName"])}</div>
                  <div
                    className={
                      showFullTeachers && user.roleName === "Admin"
                        ? "revealed-cell"
                        : "masked-cell"
                    }
                  >
                    {showFullTeachers && user.roleName === "Admin"
                      ? valueFromAny(row, ["Phone", "phone"])
                      : valueFromAny(row, [
                          "PhoneMasked",
                          "phoneMasked",
                          "Phone",
                          "phone",
                        ])}
                  </div>
                  <div
                    className={
                      showFullTeachers && user.roleName === "Admin"
                        ? "revealed-cell"
                        : "masked-cell"
                    }
                  >
                    {showFullTeachers && user.roleName === "Admin"
                      ? valueFromAny(row, ["Email", "email"])
                      : valueFromAny(row, [
                          "EmailMasked",
                          "emailMasked",
                          "Email",
                          "email",
                        ])}
                  </div>
                </div>
              ))}

              {!maskedTeachers.length && !teachers.length && <p>{t.noData}</p>}
            </div>
          </section>
        )}

        {activeDictionary === "students" &&
          renderTableCard(
            t.studentsInfo,
            ["ID", t.fullName, t.group, t.course, t.phone, t.email],
            user.roleName === "Admin"
              ? students
              : maskedStudents.length
                ? maskedStudents
                : students,
            (row, idx) => (
              <div className="table-row six-col" key={`student-${idx}`}>
                <div>{valueFromAny(row, ["StudentID", "studentId"])}</div>
                <div>{valueFromAny(row, ["FullName", "fullName"])}</div>
                <div>
                  {valueFromAny(row, [
                    "GroupName",
                    "groupName",
                    "GroupID",
                    "groupId",
                  ])}
                </div>
                <div>{valueFromAny(row, ["CourseNum", "courseNum"])}</div>
                <div>
                  {user.roleName === "Admin"
                    ? valueFromAny(row, ["Phone", "phone"])
                    : valueFromAny(row, [
                        "PhoneMasked",
                        "phoneMasked",
                        "Phone",
                        "phone",
                      ])}
                </div>
                <div>
                  {valueFromAny(row, [
                    "Email",
                    "email",
                    "EmailMasked",
                    "emailMasked",
                  ])}
                </div>
              </div>
            ),
          )}
      </section>
    );
  }

  function renderOccupancy() {
    const occupancyTabs = [
      {
        key: "classrooms",
        title: t.roomOccupancy,
        count: roomOccupancy.length,
      },
      {
        key: "teachers",
        title: t.teacherOccupancy,
        count: teacherOccupancy.length,
      },
      {
        key: "groups",
        title: t.groupOccupancy,
        count: groupOccupancy.length,
      },
    ];

    return (
      <section className="panel wide-panel">
        <div className="panel-header">
          <h3>{t.occupancy}</h3>
        </div>

        <div className="occupancy-summary-grid occupancy-top-summary">
          <div className="status-card busy">
            <span>{t.occupiedRooms}</span>
            <strong>{roomBusyCount}</strong>
          </div>
          <div className="status-card free">
            <span>{t.freeRooms}</span>
            <strong>{roomFreeCount}</strong>
          </div>
          <div className="status-card busy">
            <span>{t.busyTeachers}</span>
            <strong>{teacherBusyCount}</strong>
          </div>
          <div className="status-card free">
            <span>{t.freeTeachers}</span>
            <strong>{teacherFreeCount}</strong>
          </div>
        </div>

        <div className="dictionary-toolbar occupancy-toolbar">
          {occupancyTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`dictionary-tab ${selectedOccupancyTab === tab.key ? "active" : ""}`}
              onClick={() => setSelectedOccupancyTab(tab.key)}
            >
              <span>{tab.title}</span>
              <strong>{tab.count}</strong>
            </button>
          ))}
        </div>

        {selectedOccupancyTab === "classrooms" &&
          renderTableCard(
            t.roomOccupancy,
            [
              t.room,
              t.pair,
              t.day,
              lang === "ru" ? "Числ/знам" : "Num/Den",
              lang === "ru" ? "Статус" : "Status",
            ],
            roomOccupancy,
            (row, idx) => (
              <div className="table-row five-col" key={`ro-${idx}`}>
                <div>{valueFromAny(row, ["RoomNum", "roomNum"])}</div>
                <div>{valueFromAny(row, ["PeriodNum", "periodNum"])}</div>
                <div>{valueFromAny(row, ["WeekDay", "weekDay"])}</div>
                <div>
                  {valueFromAny(row, ["IsDenominator", "isDenominator"])
                    ? t.denominator
                    : t.numerator}
                </div>
                <div>
                  <span
                    className={`status-pill ${valueFromAny(row, ["IsBusy", "isBusy"]) ? "busy" : "free"}`}
                  >
                    {valueFromAny(row, ["IsBusy", "isBusy"])
                      ? lang === "ru"
                        ? "Занята"
                        : "Busy"
                      : lang === "ru"
                        ? "Свободна"
                        : "Free"}
                  </span>
                </div>
              </div>
            ),
          )}

        {selectedOccupancyTab === "teachers" &&
          renderTableCard(
            t.teacherOccupancy,
            [
              t.teacher,
              t.pair,
              t.day,
              lang === "ru" ? "Числ/знам" : "Num/Den",
              lang === "ru" ? "Статус" : "Status",
            ],
            teacherOccupancy,
            (row, idx) => (
              <div className="table-row five-col" key={`to-${idx}`}>
                <div>
                  {valueFromAny(row, [
                    "FullName",
                    "fullName",
                    "TeacherID",
                    "teacherId",
                  ])}
                </div>
                <div>{valueFromAny(row, ["PeriodNum", "periodNum"])}</div>
                <div>{valueFromAny(row, ["WeekDay", "weekDay"])}</div>
                <div>
                  {valueFromAny(row, ["IsDenominator", "isDenominator"])
                    ? t.denominator
                    : t.numerator}
                </div>
                <div>
                  <span
                    className={`status-pill ${valueFromAny(row, ["IsBusy", "isBusy"]) ? "busy" : "free"}`}
                  >
                    {valueFromAny(row, ["IsBusy", "isBusy"])
                      ? lang === "ru"
                        ? "Занят"
                        : "Busy"
                      : lang === "ru"
                        ? "Свободен"
                        : "Free"}
                  </span>
                </div>
              </div>
            ),
          )}

        {selectedOccupancyTab === "groups" &&
          renderTableCard(
            t.groupOccupancy,
            [
              t.group,
              t.pair,
              t.day,
              lang === "ru" ? "Числ/знам" : "Num/Den",
              lang === "ru" ? "Статус" : "Status",
            ],
            groupOccupancy,
            (row, idx) => (
              <div className="table-row five-col" key={`go-${idx}`}>
                <div>
                  {valueFromAny(row, [
                    "GroupName",
                    "groupName",
                    "GroupID",
                    "groupId",
                  ])}
                </div>
                <div>{valueFromAny(row, ["PeriodNum", "periodNum"])}</div>
                <div>{valueFromAny(row, ["WeekDay", "weekDay"])}</div>
                <div>
                  {valueFromAny(row, ["IsDenominator", "isDenominator"])
                    ? t.denominator
                    : t.numerator}
                </div>
                <div>
                  <span
                    className={`status-pill ${valueFromAny(row, ["IsBusy", "isBusy"]) ? "busy" : "free"}`}
                  >
                    {valueFromAny(row, ["IsBusy", "isBusy"])
                      ? lang === "ru"
                        ? "Занята"
                        : "Busy"
                      : lang === "ru"
                        ? "Свободна"
                        : "Free"}
                  </span>
                </div>
              </div>
            ),
          )}
      </section>
    );
  }


  function renderSqlTerminal() {
    const tabs = [
      { key: "all", label: lang === "ru" ? "Все" : "All" },
      { key: "procedures", label: lang === "ru" ? "Процедуры" : "Procedures" },
      { key: "triggers", label: lang === "ru" ? "Триггеры" : "Triggers" },
      { key: "functions", label: lang === "ru" ? "Функции" : "Functions" },
      { key: "views", label: lang === "ru" ? "Представления" : "Views" },
    ];

    const normalizeObjectType = (value) => {
      const text = String(value || "").toUpperCase();
      if (text.includes("PROCEDURE")) return "PROCEDURE";
      if (text.includes("TRIGGER")) return "TRIGGER";
      if (text.includes("FUNCTION")) return "FUNCTION";
      if (text.includes("VIEW")) return "VIEW";
      return text || "OBJECT";
    };

    const getObjectName = (item, index = 0) =>
      valueFromAny(item, ["objectName", "ObjectName", "name", "Name"]) || `object_${index + 1}`;

    const getObjectType = (item) =>
      normalizeObjectType(valueFromAny(item, ["objectType", "ObjectType", "type", "Type"]));

    const getObjectDefinition = (item) =>
      valueFromAny(item, ["objectDefinition", "ObjectDefinition", "definition", "Definition", "code", "Code"]);

    const objectsByType = safeArray(sqlObjects).reduce(
      (result, item) => {
        const type = getObjectType(item);
        if (type === "PROCEDURE") result.procedures += 1;
        if (type === "TRIGGER") result.triggers += 1;
        if (type === "FUNCTION") result.functions += 1;
        if (type === "VIEW") result.views += 1;
        return result;
      },
      { all: safeArray(sqlObjects).length, procedures: 0, triggers: 0, functions: 0, views: 0 }
    );

    const sqlExamples = [
      { title: "Full schedule", sql: "SELECT TOP 20 * FROM vw_FullSchedule;" },
      { title: "Schedule", sql: "SELECT TOP 20 * FROM Schedule;" },
      { title: "Teachers", sql: "SELECT TOP 20 * FROM Teachers;" },
      { title: "Groups", sql: "SELECT TOP 20 * FROM Groups;" },
      { title: "Classrooms", sql: "SELECT TOP 20 * FROM Classrooms;" },
    ];

    function makeSqlForObject(item, index) {
      const type = getObjectType(item);
      const name = getObjectName(item, index);
      if (type === "VIEW") return `SELECT TOP 20 * FROM ${name};`;
      if (type === "PROCEDURE") return `EXEC ${name};`;
      if (type === "FUNCTION") return `SELECT dbo.${name}(1) AS Result;`;
      if (type === "TRIGGER") return "SELECT name, parent_class_desc, create_date, modify_date FROM sys.triggers;";
      return "SELECT TOP 20 * FROM Schedule;";
    }

    function useSqlExample(sql) {
      setSqlCommand(sql);
      setSqlResult(null);
      setSqlError("");
    }

    return (
      <section className="panel sql-terminal-panel">
        <div className="panel-header sql-terminal-header">
          <div>
            <h2>SQL Server Terminal</h2>
            <p className="muted-text">
              {lang === "ru"
                ? "Объекты базы данных, SQL-команды и результат выполнения теперь находятся внутри одного терминала."
                : "Database objects, SQL commands, and execution results are now inside one terminal."}
            </p>
          </div>
          <button
            className="secondary-btn"
            type="button"
            onClick={() => loadSqlObjects(selectedSqlObjectType)}
            disabled={sqlLoading}
          >
            {lang === "ru" ? "Обновить" : "Refresh"}
          </button>
        </div>

        <div className="terminal-window">
          <div className="terminal-top">
            <span className="dot red"></span>
            <span className="dot yellow"></span>
            <span className="dot green"></span>
            <strong>UNIVER_DB_ADMIN</strong>
          </div>

          <div className="terminal-body">
            <p className="terminal-command">sqlcmd -S localhost -d UNIVER -E</p>

            {sqlError && <div className="sql-error-box">{sqlError}</div>}

            <div className="sql-filter-tabs sql-filter-tabs-inside">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`dictionary-tab ${selectedSqlObjectType === tab.key ? "active" : ""}`}
                  onClick={() => setSelectedSqlObjectType(tab.key)}
                >
                  <span>{tab.label}</span>
                  <strong>{objectsByType[tab.key] ?? 0}</strong>
                </button>
              ))}
            </div>

            <div className="sql-terminal-grid">
              <div className="sql-table-card">
                <div className="sql-card-title">
                  <strong>{lang === "ru" ? "Объекты БД" : "Database objects"}</strong>
                  <span>{sqlLoading ? (lang === "ru" ? "Загрузка..." : "Loading...") : `${sqlObjects.length}`}</span>
                </div>

                {!sqlObjects.length ? (
                  <div className="empty-sql-state">
                    {lang === "ru"
                      ? "Нет данных. Проверь /api/sql/objects?type=all"
                      : "No data. Check /api/sql/objects?type=all"}
                  </div>
                ) : (
                  <div className="sql-object-list">
                    {sqlObjects.map((item, index) => {
                      const objectType = getObjectType(item);
                      const objectName = getObjectName(item, index);
                      const definition = getObjectDefinition(item);
                      const preview = definition ? String(definition).replace(/\s+/g, " ").slice(0, 110) : "";

                      return (
                        <button
                          className="sql-object-row"
                          type="button"
                          key={`${objectType}-${objectName}-${index}`}
                          onClick={() => useSqlExample(makeSqlForObject(item, index))}
                          title={lang === "ru" ? "Нажми, чтобы вставить команду" : "Click to insert command"}
                        >
                          <span className="sql-type-pill">{objectType}</span>
                          <span className="sql-object-info">
                            <strong>{objectName}</strong>
                            {preview && <small>{preview}</small>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <form className="sql-command-card" onSubmit={handleSqlCommandSubmit}>
                <div className="sql-card-title">
                  <strong>{lang === "ru" ? "Команда" : "Command"}</strong>
                  <span>Admin only</span>
                </div>

                <textarea
                  className="sql-command-input"
                  value={sqlCommand}
                  onChange={(e) => setSqlCommand(e.target.value)}
                  placeholder="SELECT TOP 20 * FROM vw_FullSchedule;"
                  spellCheck="false"
                />

                <div className="sql-examples-row">
                  {sqlExamples.map((item) => (
                    <button
                      key={item.title}
                      className="secondary-btn"
                      type="button"
                      onClick={() => useSqlExample(item.sql)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>

                <div className="sql-command-actions">
                  <button className="main-btn" type="submit" disabled={sqlLoading}>
                    {sqlLoading
                      ? lang === "ru" ? "Выполняется..." : "Running..."
                      : lang === "ru" ? "Выполнить SQL" : "Run SQL"}
                  </button>
                  <button
                    className="danger-btn"
                    type="button"
                    onClick={() => {
                      setSqlCommand("");
                      setSqlResult(null);
                      setSqlError("");
                    }}
                  >
                    {lang === "ru" ? "Очистить" : "Clear"}
                  </button>
                </div>
              </form>
            </div>

            <div className="sql-result-card terminal-result-card">
              <div className="sql-card-title">
                <strong>{lang === "ru" ? "Результат SQL" : "SQL result"}</strong>
                <span>{sqlResult ? `${sqlResult.rows?.length || 0} rows` : "ready"}</span>
              </div>

              {!sqlResult ? (
                <pre className="sql-empty-result">
{`-- ${lang === "ru" ? "Здесь появится результат выполнения команды" : "Execution result will appear here"}
-- ${lang === "ru" ? "Пример" : "Example"}: SELECT TOP 20 * FROM vw_FullSchedule;`}
                </pre>
              ) : (
                <div className="sql-result-table-wrap">
                  <table className="sql-result-table">
                    <thead>
                      <tr>
                        {safeArray(sqlResult.columns).map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {safeArray(sqlResult.rows).map((row, rowIndex) => (
                        <tr key={`sql-row-${rowIndex}`}>
                          {safeArray(row).map((cell, cellIndex) => (
                            <td key={`sql-cell-${rowIndex}-${cellIndex}`}>
                              {cell === null || cell === undefined ? "NULL" : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderProfile() {
    return (
      <section className="panel wide-panel">
        <div className="panel-header">
          <h3>{t.profile}</h3>
        </div>
        <div className="profile-box">
          <div className="profile-row">
            <span>{t.username}</span>
            <strong>{user.username}</strong>
          </div>
          <div className="profile-row">
            <span>{t.role}</span>
            <strong>{user.roleName}</strong>
          </div>
          <div className="profile-row">
            <span>ID</span>
            <strong>{user.id}</strong>
          </div>
          {user.teacherId && (
            <div className="profile-row">
              <span>Teacher ID</span>
              <strong>{user.teacherId}</strong>
            </div>
          )}
          {user.studentId && (
            <div className="profile-row">
              <span>Student ID</span>
              <strong>{user.studentId}</strong>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (!user) return renderLogin();

  return (
    <div
      className={`dashboard-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      onClick={closeContextMenu}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="mac-traffic-controls" aria-label="Sidebar window controls">
            <button
              type="button"
              className="traffic-btn traffic-close"
              title={lang === "ru" ? "Выйти из аккаунта" : "Log out"}
              aria-label={lang === "ru" ? "Выйти из аккаунта" : "Log out"}
              onClick={(event) => {
                event.stopPropagation();
                handleLogout();
              }}
            />
            <button
              type="button"
              className="traffic-btn traffic-minimize"
              title={
                sidebarCollapsed
                  ? lang === "ru"
                    ? "Раскрыть меню"
                    : "Expand sidebar"
                  : lang === "ru"
                    ? "Свернуть меню"
                    : "Collapse sidebar"
              }
              aria-label={
                sidebarCollapsed
                  ? lang === "ru"
                    ? "Раскрыть меню"
                    : "Expand sidebar"
                  : lang === "ru"
                    ? "Свернуть меню"
                    : "Collapse sidebar"
              }
              onClick={(event) => {
                event.stopPropagation();
                setSidebarCollapsed((prev) => !prev);
              }}
            />
            <button
              type="button"
              className={`traffic-btn traffic-fullscreen ${isFullscreen ? "active" : ""}`}
              title={
                isFullscreen
                  ? lang === "ru"
                    ? "Выйти из fullscreen"
                    : "Exit fullscreen"
                  : lang === "ru"
                    ? "Открыть fullscreen"
                    : "Open fullscreen"
              }
              aria-label={
                isFullscreen
                  ? lang === "ru"
                    ? "Выйти из fullscreen"
                    : "Exit fullscreen"
                  : lang === "ru"
                    ? "Открыть fullscreen"
                    : "Open fullscreen"
              }
              onClick={(event) => {
                event.stopPropagation();
                toggleFullscreen();
              }}
            />
          </div>

          <div className="brand-logo">◫</div>
          <div className="brand-text">
            <div className="brand-title">UNIVER</div>
            <div className="brand-subtitle">React + Spring</div>
          </div>
        </div>

        <nav className="menu">
          <button
            className={`menu-item ${activePage === "home" ? "active" : ""}`}
            onClick={() => setActivePage("home")}
          >
            {t.home}
          </button>
          <button
            className={`menu-item ${activePage === "schedule" ? "active" : ""}`}
            onClick={() => setActivePage("schedule")}
          >
            {t.schedule}
          </button>

          {user.roleName !== "Admin" && (
            <button
              className={`menu-item ${activePage === "grades" ? "active" : ""}`}
              onClick={() => setActivePage("grades")}
            >
              {t.grades}
            </button>
          )}

          {user.roleName === "Teacher" && (
            <>
              <button
                className={`menu-item ${activePage === "dictionaries" ? "active" : ""}`}
                onClick={() => setActivePage("dictionaries")}
              >
                {t.dictionaries}
              </button>
              <button
                className={`menu-item ${activePage === "occupancy" ? "active" : ""}`}
                onClick={() => setActivePage("occupancy")}
              >
                {t.occupancy}
              </button>
            </>
          )}

          {user.roleName === "Admin" && (
            <>
              <button
                className={`menu-item ${activePage === "users" ? "active" : ""}`}
                onClick={() => setActivePage("users")}
              >
                {t.users}
              </button>
              <button
                className={`menu-item ${activePage === "dictionaries" ? "active" : ""}`}
                onClick={() => setActivePage("dictionaries")}
              >
                {t.dictionaries}
              </button>
              <button
                className={`menu-item ${activePage === "occupancy" ? "active" : ""}`}
                onClick={() => setActivePage("occupancy")}
              >
                {t.occupancy}
              </button>
              <button
                className={`menu-item ${activePage === "sqlTerminal" ? "active" : ""}`}
                onClick={() => setActivePage("sqlTerminal")}
              >
                {t.sqlTerminal}
              </button>
              <button
                className={`menu-item ${activePage === "transfer" ? "active" : ""}`}
                onClick={() => setActivePage("transfer")}
              >
                {t.transfer}
              </button>
              <button
                className={`menu-item ${activePage === "backup" ? "active" : ""}`}
                onClick={() => setActivePage("backup")}
              >
                {t.backup}
              </button>
            </>
          )}

          <button
            className={`menu-item ${activePage === "profile" ? "active" : ""}`}
            onClick={() => setActivePage("profile")}
          >
            {t.profile}
          </button>
        </nav>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumbs">
              {t.home} &gt; {pageTitleMap[activePage]}
            </div>
            <h1 className="welcome-title">{pageTitleMap[activePage]}</h1>
            <div className="role-badge">{user.roleName}</div>
          </div>

          <div className="topbar-actions">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setShowNotifications((v) => !v);
                setShowSettings(false);
              }}
            >
              🔔
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setShowSettings((v) => !v);
                setShowNotifications(false);
              }}
            >
              ⚙️
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              {t.logout}
            </button>
          </div>
        </header>

        {loading && (
          <section className="panel top-popover">
            <div className="simple-item">Loading...</div>
          </section>
        )}

        {showNotifications && (
          <section className="notification-center-panel">
            <div className="panel-header">
              <h3>{t.notifications}</h3>
            </div>
            <div className="simple-list">
              {!notifications.length && (
                <div className="simple-item">{t.notificationsEmpty}</div>
              )}
              {notifications.map((item) => (
                <div className="simple-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <div className="notification-text">{item.text}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {showSettings && (
          <section className="panel top-popover">
            <div className="panel-header">
              <h3>{t.settings}</h3>
            </div>
            <div className="settings-list">
              <div className="settings-row">
                <span>{t.darkMode}</span>
                <button
                  className={`mac-switch ${theme === "dark" ? "on" : ""}`}
                  type="button"
                  onClick={() =>
                    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
                  }
                >
                  <span></span>
                </button>
              </div>
              <div className="settings-row">
                <span>{t.language}</span>
                <div className="settings-actions">
                  <button
                    className={`secondary-btn ${lang === "ru" ? "active-mini-btn" : ""}`}
                    type="button"
                    onClick={() => setLang("ru")}
                  >
                    RU
                  </button>
                  <button
                    className={`secondary-btn ${lang === "en" ? "active-mini-btn" : ""}`}
                    type="button"
                    onClick={() => setLang("en")}
                  >
                    EN
                  </button>
                  <button
                    className={`secondary-btn ${lang === "zh" ? "active-mini-btn" : ""}`}
                    type="button"
                    onClick={() => setLang("zh")}
                  >
                    中文
                  </button>
                </div>
              </div>
              <div className="settings-row">
                <span>{t.compactMode}</span>
                <button
                  className={`mac-switch ${compactMode ? "on" : ""}`}
                  type="button"
                  onClick={() => setCompactMode((prev) => !prev)}
                >
                  <span></span>
                </button>
              </div>
            </div>
          </section>
        )}

        {activePage === "home" && renderHome()}
        {activePage === "schedule" && renderSchedule()}
        {activePage === "grades" && user.roleName !== "Admin" && renderGrades()}
        {activePage === "users" && user.roleName === "Admin" && renderUsers()}
        {activePage === "transfer" && user.roleName === "Admin" && renderTransfer()}
        {activePage === "backup" && user.roleName === "Admin" && renderBackup()}
        {activePage === "sqlTerminal" && user.roleName === "Admin" && renderSqlTerminal()}
        {activePage === "dictionaries" && user.roleName !== "Student" && renderDictionaries()}
        {activePage === "occupancy" && user.roleName !== "Student" && renderOccupancy()}
        {contextMenu && (
          <div
            className="mac-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="context-title">{contextMenu.title}</div>
            {contextMenu.subtitle && (
              <div className="context-subtitle">{contextMenu.subtitle}</div>
            )}
            <button
              type="button"
              onClick={() => {
                alert("Открыть детали");
                closeContextMenu();
              }}
            >
              ⌘ Открыть
            </button>
            <button
              type="button"
              onClick={() => {
                alert("Скопировано");
                closeContextMenu();
              }}
            >
              ⧉ Копировать
            </button>
            {user.roleName === "Admin" && (
              <button
                type="button"
                onClick={() => {
                  alert("Действие администратора");
                  closeContextMenu();
                }}
              >
                ✎ Редактировать
              </button>
            )}
          </div>
        )}

        {activePage === "profile" && renderProfile()}

        <nav className="iphone-bottom-nav">
          <button
            className={activePage === "home" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("home")}
          >
            <span>⌂</span>
            <small>{t.home}</small>
          </button>
          <button
            className={activePage === "schedule" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("schedule")}
          >
            <span>▦</span>
            <small>{t.schedule}</small>
          </button>

          {user.roleName !== "Admin" && (
            <button
              className={activePage === "grades" ? "active" : ""}
              type="button"
              onClick={() => setActivePage("grades")}
            >
              <span>☆</span>
              <small>{t.grades}</small>
            </button>
          )}

          {user.roleName !== "Student" && (
            <>
              <button
                className={activePage === "dictionaries" ? "active" : ""}
                type="button"
                onClick={() => setActivePage("dictionaries")}
              >
                <span>◫</span>
                <small>{t.dictionaries}</small>
              </button>
              <button
                className={activePage === "occupancy" ? "active" : ""}
                type="button"
                onClick={() => setActivePage("occupancy")}
              >
                <span>●</span>
                <small>{t.occupancy}</small>
              </button>
              {user.roleName === "Admin" && (
                <button
                  className={activePage === "sqlTerminal" ? "active" : ""}
                  type="button"
                  onClick={() => setActivePage("sqlTerminal")}
                >
                  <span>⌘</span>
                  <small>SQL</small>
                </button>
              )}
            </>
          )}

          <button
            className={activePage === "profile" ? "active" : ""}
            type="button"
            onClick={() => setActivePage("profile")}
          >
            <span>◉</span>
            <small>{t.profile}</small>
          </button>
        </nav>

        {user.roleName === "Admin" && (
          <button
            className="iphone-fab"
            type="button"
            title={t.addLesson}
            onClick={() => {
              setActivePage("schedule");
              setShowAddForm(true);
            }}
          >
            +
          </button>
        )}
      </main>
    </div>
  );
}

export default App;
