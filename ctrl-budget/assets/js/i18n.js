/* Internationalisation de CTRL Budget.
   Chaque clé porte les trois traductions dans l'ordre : fr, en, es. */

export const LANGUES = {
  fr: { code: 'fr', libelle: 'Français', locale: 'fr-FR' },
  en: { code: 'en', libelle: 'English', locale: 'en-GB' },
  es: { code: 'es', libelle: 'Español', locale: 'es-ES' }
};

const ORDRE = ['fr', 'en', 'es'];

const DICT = {
  /* ---------- Navigation et généralités ---------- */
  'nav.dashboard': ['Tableau de bord', 'Dashboard', 'Panel'],
  'nav.charges': ['Charges fixes', 'Fixed costs', 'Gastos fijos'],
  'nav.expenses': ['Dépenses', 'Spending', 'Gastos'],
  'nav.credits': ['Crédits', 'Loans', 'Préstamos'],
  'nav.savings': ['Épargne', 'Savings', 'Ahorro'],
  'nav.profile': ['Mon profil', 'My profile', 'Mi perfil'],
  'nav.addExpense': ['+ Dépense', '+ Expense', '+ Gasto'],

  'common.save': ['Enregistrer', 'Save', 'Guardar'],
  'common.cancel': ['Annuler', 'Cancel', 'Cancelar'],
  'common.delete': ['Supprimer', 'Delete', 'Eliminar'],
  'common.edit': ['Modifier', 'Edit', 'Editar'],
  'common.add': ['Ajouter', 'Add', 'Añadir'],
  'common.export': ['Exporter', 'Export', 'Exportar'],
  'common.back': ['Retour', 'Back', 'Volver'],
  'common.continue': ['Continuer', 'Continuer', 'Continuar'],
  'common.optional': ['Facultatif', 'Optional', 'Opcional'],
  'common.label': ['Libellé', 'Label', 'Concepto'],
  'common.amount': ['Montant', 'Amount', 'Importe'],
  'common.date': ['Date', 'Date', 'Fecha'],
  'common.category': ['Catégorie', 'Category', 'Categoría'],
  'common.nature': ['Nature', 'Type', 'Naturaleza'],
  'common.thisMonth': ['Ce mois-ci', 'This month', 'Este mes'],
  'common.prevMonth': ['Mois précédent', 'Previous month', 'Mes anterior'],
  'common.nextMonth': ['Mois suivant', 'Next month', 'Mes siguiente'],
  'common.chooseMonth': ['Choisir un mois', 'Choose a month', 'Elegir un mes'],
  'common.invalidAmount': ['Montant invalide', 'Invalid amount', 'Importe no válido'],
  'common.labelRequired': ['Le libellé est obligatoire', 'A label is required', 'El concepto es obligatorio'],
  'common.loadError': ['Impossible de charger vos données. Rechargez la page.', 'Could not load your data. Please reload.', 'No se han podido cargar tus datos. Recarga la página.'],
  'common.saved': ['Enregistré', 'Saved', 'Guardado'],
  'common.deleted': ['Supprimé', 'Deleted', 'Eliminado'],
  'common.lines': ['{n} ligne(s)', '{n} line(s)', '{n} línea(s)'],

  /* ---------- Natures et catégories ---------- */
  'nature.fixe': ['Charge fixe', 'Fixed cost', 'Gasto fijo'],
  'nature.credit': ['Crédit', 'Loan', 'Préstamo'],
  'nature.abonnement': ['Abonnement', 'Subscription', 'Suscripción'],
  'nature.variable': ['Variable', 'Variable', 'Variable'],
  'nature.epargne': ['Épargne', 'Savings', 'Ahorro'],

  'cat.logement': ['Logement', 'Housing', 'Vivienda'],
  'cat.energie': ['Énergie', 'Utilities', 'Energía'],
  'cat.telecom': ['Télécom et internet', 'Telecom and internet', 'Telecomunicaciones'],
  'cat.assurance': ['Assurances', 'Insurance', 'Seguros'],
  'cat.transport': ['Transport', 'Transport', 'Transporte'],
  'cat.alimentation': ['Alimentation', 'Groceries', 'Alimentación'],
  'cat.sante': ['Santé', 'Health', 'Salud'],
  'cat.loisirs': ['Loisirs et sport', 'Leisure and sport', 'Ocio y deporte'],
  'cat.banque': ['Banque et frais', 'Banking and fees', 'Banca y comisiones'],
  'cat.credit': ['Crédits', 'Loans', 'Préstamos'],
  'cat.impots': ['Impôts', 'Taxes', 'Impuestos'],
  'cat.enfants': ['Enfants', 'Children', 'Hijos'],
  'cat.epargne': ['Épargne et placements', 'Savings and investments', 'Ahorro e inversiones'],
  'cat.autre': ['Autre', 'Other', 'Otro'],

  'rev.salaire': ['Salaire', 'Salary', 'Salario'],
  'rev.prime': ['Prime', 'Bonus', 'Prima'],
  'rev.aide': ['Aide ou allocation', 'Benefit or allowance', 'Ayuda o subsidio'],
  'rev.freelance': ['Activité indépendante', 'Self-employed income', 'Actividad autónoma'],
  'rev.loyer': ['Loyer perçu', 'Rental income', 'Alquiler percibido'],
  'rev.autre': ['Autre entrée', 'Other income', 'Otro ingreso'],

  /* ---------- Tableau de bord ---------- */
  'dash.hello': ['Bonjour {n}', 'Hello {n}', 'Hola {n}'],
  'dash.yourMonth': ['Votre mois', 'Your month', 'Tu mes'],
  'dash.subtitle': ['Mise à jour permanente de votre reste à vivre', 'Your disposable income, always up to date', 'Tu dinero disponible, siempre actualizado'],
  'dash.realRest': ['Reste réel après dépenses', 'Left after spending', 'Queda tras gastos'],
  'dash.evolution': ['{p} de dépenses vs {m}', '{p} spending vs {m}', '{p} de gasto vs {m}'],
  'dash.fixed': ['Charges fixes', 'Fixed costs', 'Gastos fijos'],
  'dash.spent': ['Dépensé', 'Spent', 'Gastado'],
  'dash.left': ['Reste', 'Left', 'Queda'],
  'dash.income': ["Entrées du mois", 'Income this month', 'Ingresos del mes'],
  'dash.ofWhichCredits': ['dont {m} de crédits', 'including {m} in loans', 'incluye {m} en préstamos'],
  'dash.dailyExpenses': ['Dépenses courantes', 'Day-to-day spending', 'Gastos corrientes'],
  'dash.entries': ['{n} saisie(s)', '{n} record(s)', '{n} registro(s)'],
  'dash.disposable': ['Reste à vivre', 'Disposable income', 'Dinero disponible'],
  'dash.beforeExpenses': ['avant dépenses courantes', 'before day-to-day spending', 'antes de gastos corrientes'],
  'dash.dailyBudget': ['Budget restant par jour', 'Daily budget left', 'Presupuesto diario restante'],
  'dash.daysLeft': ['Il reste {n} jour(s) avant la fin du mois.', '{n} day(s) left until the end of the month.', 'Quedan {n} día(s) hasta fin de mes.'],
  'dash.projection': ['Projection de fin de mois', 'End-of-month projection', 'Proyección de fin de mes'],
  'dash.pace': ['Au rythme de {m} par jour depuis le 1er.', 'At {m} per day since the 1st.', 'A un ritmo de {m} al día desde el día 1.'],
  'dash.cumulative': ['Dépenses cumulées, {a} contre {b}', 'Cumulative spending, {a} vs {b}', 'Gasto acumulado, {a} frente a {b}'],
  'dash.whereMoney': ['Où part votre argent', 'Where your money goes', 'Adónde va tu dinero'],
  'dash.nextDebits': ['Prochains prélèvements', 'Upcoming direct debits', 'Próximos cargos'],
  'dash.noDebits': ['Aucun prélèvement à venir', 'No upcoming debits', 'Sin cargos próximos'],
  'dash.noDebitsHelp': ['Renseignez le jour de prélèvement de vos charges pour les voir arriver.', 'Add a debit day to your fixed costs to see them here.', 'Indica el día de cargo de tus gastos fijos para verlos aquí.'],
  'dash.totalUpcoming': ["Total à venir d'ici la fin du mois : {m}", 'Total due before month end: {m}', 'Total pendiente hasta fin de mes: {m}'],
  'dash.onDay': ['le {d} {m}', 'on {m} {d}', 'el {d} de {m}'],
  'dash.last6': ['Dépenses courantes des 6 derniers mois', 'Day-to-day spending, last 6 months', 'Gastos corrientes, últimos 6 meses'],
  'dash.nothingToSplit': ['Rien à répartir', 'Nothing to break down', 'Nada que repartir'],
  'dash.nothingToSplitHelp': ['Ajoutez vos charges pour voir la répartition.', 'Add your fixed costs to see the breakdown.', 'Añade tus gastos fijos para ver el reparto.'],
  'dash.dayMarker': ['jour {d}', 'day {d}', 'día {d}'],

  'alert.over': ['Vous avez dépassé votre budget de {m} ce mois-ci. Regardez la répartition pour trouver le poste responsable.', 'You are {m} over budget this month. Check the breakdown to find the culprit.', 'Has superado tu presupuesto en {m} este mes. Revisa el reparto para ver la causa.'],
  'alert.pace': ['À ce rythme, vous finirez le mois avec {m} de trop. Il faudrait rester sous {d} par jour.', 'At this pace you will end the month {m} over. Aim to stay under {d} per day.', 'A este ritmo terminarás el mes con {m} de más. Mantente por debajo de {d} al día.'],
  'alert.better': ['Vous dépensez moins vite que le mois dernier. Continuez comme ça.', 'You are spending more slowly than last month. Keep it up.', 'Estás gastando menos que el mes pasado. Sigue así.'],
  'alert.debt': ['Vos crédits pèsent {p} de vos entrées, au dessus du seuil de 35 % retenu par les banques.', 'Your loans take up {p} of your income, above the 35% threshold banks use.', 'Tus préstamos suponen el {p} de tus ingresos, por encima del umbral bancario del 35 %.'],
  'alert.ending': ['Fin de {n} charge(s) dans les 3 mois : {l}. Cela libérera {m} par mois.', '{n} cost(s) end within 3 months: {l}. That frees up {m} per month.', 'Fin de {n} gasto(s) en 3 meses: {l}. Liberará {m} al mes.'],

  /* ---------- Charges ---------- */
  'charges.subtitle': ['Tout ce qui part chaque mois, classé par nature', 'Everything leaving your account monthly, sorted by type', 'Todo lo que sale cada mes, por naturaleza'],
  'charges.all': ['Toutes', 'All', 'Todos'],
  'charges.count': ['{n} charge(s)', '{n} item(s)', '{n} gasto(s)'],
  'charges.empty': ['Aucune charge ici', 'Nothing here', 'Sin gastos aquí'],
  'charges.emptyHelp': ['Changez de filtre ou ajoutez une charge avec le bouton en haut.', 'Change the filter or add one with the button above.', 'Cambia el filtro o añade uno con el botón de arriba.'],
  'charges.new': ['+ Charge', '+ Cost', '+ Gasto'],
  'charges.newTitle': ['Nouvelle charge fixe', 'New fixed cost', 'Nuevo gasto fijo'],
  'charges.editTitle': ['Modifier la charge', 'Edit fixed cost', 'Editar gasto fijo'],
  'charges.debitDay': ['Jour de prélèvement', 'Debit day', 'Día de cargo'],
  'charges.start': ['Début de la charge', 'Starts on', 'Inicio del gasto'],
  'charges.startHelp': ['Vide si elle existe déjà depuis longtemps.', 'Leave empty if it already existed.', 'Vacío si ya existía antes.'],
  'charges.end': ["Fin de l'engagement", 'Ends on', 'Fin del compromiso'],
  'charges.endHelp': ['Facultatif, crédits et abonnements.', 'Optional, loans and subscriptions.', 'Opcional, préstamos y suscripciones.'],
  'charges.active': ['Charge active, à compter dans le budget', 'Active, counted in the budget', 'Activo, se cuenta en el presupuesto'],
  'charges.deleteTitle': ['Supprimer la charge', 'Delete fixed cost', 'Eliminar gasto fijo'],
  'charges.deleteText': ['« {l} » sera retirée de tous vos mois. Pour la garder dans l\'historique, décochez plutôt « charge active ».', '"{l}" will be removed from every month. To keep it in your history, untick "active" instead.', '«{l}» se quitará de todos los meses. Para conservarlo en el historial, desmarca «activo».'],
  'charges.monthsLeft': ['{n} mensualité(s)', '{n} payment(s) left', '{n} cuota(s)'],
  'charges.endedOn': ['fin {d}', 'ends {d}', 'fin {d}'],
  'charges.from': ['depuis {d}', 'from {d}', 'desde {d}'],

  /* ---------- Dépenses ---------- */
  'exp.subtitle': ['Courses, essence, sorties, imprévus', 'Groceries, fuel, outings, surprises', 'Compra, gasolina, salidas, imprevistos'],
  'exp.spentMonth': ['Dépensé ce mois', 'Spent this month', 'Gastado este mes'],
  'exp.avgDay': ['Moyenne par jour', 'Daily average', 'Media diaria'],
  'exp.new': ['+ Dépense', '+ Expense', '+ Gasto'],
  'exp.newTitle': ['Nouvelle dépense', 'New expense', 'Nuevo gasto'],
  'exp.editTitle': ['Modifier la dépense', 'Edit expense', 'Editar gasto'],
  'exp.empty': ['Aucune dépense saisie', 'No expenses yet', 'Sin gastos registrados'],
  'exp.emptyHelp': ['Ajoutez votre première dépense du mois, le reste à vivre se met à jour aussitôt.', 'Add your first expense, your disposable income updates instantly.', 'Añade tu primer gasto, el disponible se actualiza al instante.'],

  /* ---------- Crédits ---------- */
  'cred.subtitle': ["Ce qui vous reste à payer, et quand cela s'arrête", 'What is left to repay, and when it ends', 'Lo que queda por pagar y cuándo termina'],
  'cred.monthly': ['Mensualités du mois', 'Payments this month', 'Cuotas del mes'],
  'cred.inProgress': ['{n} crédit(s) en cours', '{n} loan(s) running', '{n} préstamo(s) en curso'],
  'cred.remainingDebt': ['Reste à rembourser estimé', 'Estimated remaining debt', 'Deuda restante estimada'],
  'cred.basisEnd': ['Sur la base des dates de fin', 'Based on the end dates', 'Según las fechas de fin'],
  'cred.excluded': ['Hors crédits sans date de fin', 'Excluding loans with no end date', 'Sin incluir préstamos sin fecha de fin'],
  'cred.ratio': ["Taux d'endettement", 'Debt-to-income ratio', 'Ratio de endeudamiento'],
  'cred.threshold': ['Seuil bancaire courant : 35 %', 'Common bank threshold: 35%', 'Umbral bancario habitual: 35 %'],
  'cred.yours': ['Vos crédits', 'Your loans', 'Tus préstamos'],
  'cred.none': ['Aucun crédit enregistré', 'No loans recorded', 'Sin préstamos registrados'],
  'cred.noneHelp': ['Une charge devient un crédit quand vous choisissez la nature « Crédit ».', 'A cost becomes a loan when you set its type to "Loan".', 'Un gasto se convierte en préstamo al elegir la naturaleza «Préstamo».'],
  'cred.until': ['{n} mensualité(s) restante(s), jusqu\'au {d}', '{n} payment(s) left, until {d}', '{n} cuota(s) restante(s), hasta {d}'],
  'cred.unknown': ['Durée non renseignée', 'Duration not set', 'Duración no indicada'],
  'cred.remains': ['reste {m}', '{m} left', 'queda {m}'],
  'cred.freed': ['Budget libéré à la fin de chaque crédit', 'Budget freed as each loan ends', 'Presupuesto liberado al terminar cada préstamo'],
  'cred.endOf': ['fin de {l}', 'end of {l}', 'fin de {l}'],
  'cred.perMonth': ['+ {m} par mois', '+ {m} per month', '+ {m} al mes'],
  'cred.afterAll': ['Une fois ces crédits terminés, votre reste à vivre augmentera de {m} par mois.', 'Once these loans end, your disposable income rises by {m} per month.', 'Cuando terminen estos préstamos, tu disponible subirá {m} al mes.'],

  /* ---------- Épargne ---------- */
  'sav.subtitle': ['Votre effort d\'épargne, mois après mois', 'Your savings effort, month after month', 'Tu esfuerzo de ahorro, mes a mes'],
  'sav.balance': ['Épargne totale estimée', 'Estimated total savings', 'Ahorro total estimado'],
  'sav.balanceHelp': ['Solde de départ, versements automatiques et mouvements manuels', 'Opening balance, automatic transfers and manual movements', 'Saldo inicial, aportaciones automáticas y movimientos manuales'],
  'sav.monthlyAuto': ['Versement automatique du mois', 'Automatic transfer this month', 'Aportación automática del mes'],
  'sav.monthlyAutoHelp': ['Somme de vos charges de nature Épargne', 'Sum of your fixed costs typed as Savings', 'Suma de tus gastos fijos de naturaleza Ahorro'],
  'sav.goal': ['Objectif mensuel', 'Monthly goal', 'Objetivo mensual'],
  'sav.goalReached': ['Objectif atteint ce mois', 'Goal reached this month', 'Objetivo alcanzado este mes'],
  'sav.goalMissing': ['Il manque {m} pour votre objectif du mois', '{m} short of your monthly goal', 'Faltan {m} para tu objetivo del mes'],
  'sav.noGoal': ['Aucun objectif défini', 'No goal set', 'Sin objetivo definido'],
  'sav.history': ['Historique', 'History', 'Historial'],
  'sav.autoLine': ['Versement automatique', 'Automatic transfer', 'Aportación automática'],
  'sav.initial': ['Solde de départ', 'Opening balance', 'Saldo inicial'],
  'sav.newMovement': ['+ Mouvement', '+ Movement', '+ Movimiento'],
  'sav.movementTitle': ["Mouvement d'épargne", 'Savings movement', 'Movimiento de ahorro'],
  'sav.deposit': ['Versement', 'Deposit', 'Aportación'],
  'sav.withdrawal': ['Retrait', 'Withdrawal', 'Retirada'],
  'sav.type': ['Type de mouvement', 'Movement type', 'Tipo de movimiento'],
  'sav.empty': ['Aucun mouvement manuel', 'No manual movements', 'Sin movimientos manuales'],
  'sav.emptyHelp': ['Les charges de nature Épargne alimentent le solde automatiquement chaque mois.', 'Costs typed as Savings feed the balance automatically each month.', 'Los gastos de naturaleza Ahorro alimentan el saldo cada mes.'],
  'sav.evolution': ['Évolution de votre épargne', 'Savings over time', 'Evolución de tu ahorro'],
  'sav.editInitial': ['Modifier le solde de départ', 'Edit opening balance', 'Editar saldo inicial'],
  'sav.projection': ['À ce rythme, vous atteindrez {m} dans 12 mois.', 'At this pace you will reach {m} in 12 months.', 'A este ritmo alcanzarás {m} en 12 meses.'],

  /* ---------- Profil ---------- */
  'prof.subtitle': ["Votre compte, vos entrées d'argent et vos données", 'Your account, your income and your data', 'Tu cuenta, tus ingresos y tus datos'],
  'prof.account': ['Compte', 'Account', 'Cuenta'],
  'prof.connectedAs': ['Connecté en tant que {n}', 'Signed in as {n}', 'Conectado como {n}'],
  'prof.connected': ['Connecté', 'Signed in', 'Conectado'],
  'prof.logout': ['Se déconnecter', 'Sign out', 'Cerrar sesión'],
  'prof.income': ["Entrées d'argent", 'Income', 'Ingresos'],
  'prof.newIncome': ['+ Entrée', '+ Income', '+ Ingreso'],
  'prof.noIncome': ['Aucune entrée', 'No income yet', 'Sin ingresos'],
  'prof.noIncomeHelp': ['Ajoutez votre salaire pour calculer le reste à vivre.', 'Add your salary to compute your disposable income.', 'Añade tu salario para calcular el disponible.'],
  'prof.newIncomeTitle': ["Nouvelle entrée d'argent", 'New income', 'Nuevo ingreso'],
  'prof.editIncomeTitle': ["Modifier l'entrée", 'Edit income', 'Editar ingreso'],
  'prof.recurring': ['Tous les mois', 'Every month', 'Todos los meses'],
  'prof.oneOff': ['Un seul mois', 'One month only', 'Solo un mes'],
  'prof.frequency': ['Fréquence', 'Frequency', 'Frecuencia'],
  'prof.monthConcerned': ['Mois concerné', 'Month', 'Mes'],
  'prof.activeIncome': ['Entrée active', 'Active', 'Ingreso activo'],
  'prof.oneOffOn': ['ponctuel {m}', 'one-off {m}', 'puntual {m}'],
  'prof.disabled': ['désactivée', 'disabled', 'desactivado'],
  'prof.deleteIncome': ["Supprimer l'entrée", 'Delete income', 'Eliminar ingreso'],
  'prof.deleteIncomeText': ['« {l} » ne sera plus comptée dans vos budgets.', '"{l}" will no longer count in your budgets.', '«{l}» dejará de contar en tus presupuestos.'],
  'prof.card': ['Profil', 'Profile', 'Perfil'],
  'prof.firstName': ['Prénom', 'First name', 'Nombre'],
  'prof.savingsGoal': ["Objectif d'épargne mensuel", 'Monthly savings goal', 'Objetivo de ahorro mensual'],
  'prof.preferences': ['Langue et devise', 'Language and currency', 'Idioma y moneda'],
  'prof.language': ["Langue de l'interface", 'Interface language', 'Idioma de la interfaz'],
  'prof.currency': ['Devise', 'Currency', 'Moneda'],
  'prof.currencyHelp': ['Le changement de devise propose de convertir vos montants au taux de change du jour.', 'Changing currency offers to convert your amounts at today\'s rate.', 'Al cambiar de moneda se ofrece convertir tus importes al cambio del día.'],
  'prof.convertTitle': ['Convertir vos montants ?', 'Convert your amounts?', '¿Convertir tus importes?'],
  'prof.convertText': ['1 {a} = {t} {b} aujourd\'hui. Vos {n} lignes peuvent être converties automatiquement. Sinon, seuls le symbole et le format changent.', '1 {a} = {t} {b} today. Your {n} records can be converted automatically. Otherwise only the symbol and format change.', '1 {a} = {t} {b} hoy. Tus {n} registros pueden convertirse automáticamente. Si no, solo cambian el símbolo y el formato.'],
  'prof.convertYes': ['Convertir les montants', 'Convert amounts', 'Convertir importes'],
  'prof.convertNo': ['Changer le symbole seulement', 'Change symbol only', 'Cambiar solo el símbolo'],
  'prof.rateError': ['Taux de change indisponible. Le symbole a été changé, les montants sont inchangés.', 'Exchange rate unavailable. The symbol changed, amounts are unchanged.', 'Tipo de cambio no disponible. Se cambió el símbolo, los importes no.'],
  'prof.converted': ['Montants convertis au taux du jour', 'Amounts converted at today\'s rate', 'Importes convertidos al cambio del día'],
  'prof.security': ['Sécurité', 'Security', 'Seguridad'],
  'prof.securityText': ["Votre mot de passe est stocké sous forme chiffrée par notre prestataire d'authentification, il n'est lisible par personne, pas même par l'éditeur du site.", 'Your password is stored hashed by our authentication provider. Nobody can read it, not even the site owner.', 'Tu contraseña se guarda cifrada por nuestro proveedor de autenticación. Nadie puede leerla, ni el editor del sitio.'],
  'prof.changePassword': ['Changer de mot de passe', 'Change password', 'Cambiar contraseña'],
  'prof.newPassword': ['Nouveau mot de passe', 'New password', 'Nueva contraseña'],
  'prof.passwordHelp': ['10 caractères minimum, avec au moins une lettre et un chiffre.', 'At least 10 characters, with one letter and one digit.', 'Mínimo 10 caracteres, con una letra y un número.'],
  'prof.passwordWeak': ['Mot de passe trop simple', 'Password too weak', 'Contraseña demasiado simple'],
  'prof.passwordUpdated': ['Mot de passe mis à jour', 'Password updated', 'Contraseña actualizada'],
  'prof.data': ['Vos données', 'Your data', 'Tus datos'],
  'prof.dataText': ['Conformément au RGPD, vous pouvez récupérer vos données à tout moment et supprimer définitivement votre compte.', 'Under GDPR you can export your data at any time and delete your account permanently.', 'Conforme al RGPD, puedes exportar tus datos y eliminar tu cuenta de forma permanente.'],
  'prof.exportAll': ['Exporter toutes mes données', 'Export all my data', 'Exportar todos mis datos'],
  'prof.deleteAccount': ['Supprimer mon compte', 'Delete my account', 'Eliminar mi cuenta'],
  'prof.deleteTitle': ['Supprimer votre compte', 'Delete your account', 'Eliminar tu cuenta'],
  'prof.deleteText': ['Toutes vos entrées, charges et dépenses seront effacées définitivement. Cette action est irréversible. Pensez à exporter vos données avant.', 'All your income, costs and expenses will be erased permanently. This cannot be undone. Export your data first.', 'Todos tus ingresos, gastos y registros se borrarán definitivamente. Es irreversible. Exporta tus datos antes.'],
  'prof.deleteConfirm': ['Supprimer définitivement', 'Delete permanently', 'Eliminar definitivamente'],
  'prof.deleteFailed': ["La suppression a échoué. Réessayez ou écrivez à l'adresse de contact.", 'Deletion failed. Try again or contact support.', 'La eliminación ha fallado. Inténtalo de nuevo o escribe al contacto.'],

  /* ---------- Onboarding ---------- */
  'onb.step': ['Étape {a} sur {b}', 'Step {a} of {b}', 'Paso {a} de {b}'],
  'onb.welcome': ['Bienvenue', 'Welcome', 'Bienvenido'],
  'onb.welcomeText': ["Trois minutes pour poser votre budget, et vous n'y reviendrez qu'en cas de changement.", 'Three minutes to set up your budget, then you only come back when something changes.', 'Tres minutos para montar tu presupuesto, después solo vuelves si algo cambia.'],
  'onb.firstNameHelp': ["Utilisé uniquement pour l'accueil de votre tableau de bord.", 'Only used to greet you on your dashboard.', 'Solo se usa para saludarte en tu panel.'],
  'onb.noBank': ["Vous n'aurez jamais à connecter votre banque. Vous saisissez vos montants, l'application fait les calculs.", 'You never connect your bank. You enter the amounts, the app does the maths.', 'Nunca conectas tu banco. Tú introduces los importes, la app calcula.'],
  'onb.start': ['Commencer', 'Get started', 'Empezar'],
  'onb.importTitle': ['Vous tenez déjà un fichier ?', 'Already keep a file?', '¿Ya tienes un archivo?'],
  'onb.importChoose': ['Choisir un fichier', 'Choose a file', 'Elegir un archivo'],
  'onb.importDrop': ['ou glissez-le ici. PDF, Excel, CSV, Word, 5 Mo maximum.', 'or drop it here. PDF, Excel, CSV, Word, 5 MB max.', 'o suéltalo aquí. PDF, Excel, CSV, Word, 5 MB máximo.'],
  'onb.importRules': ['Ce que le fichier doit contenir', 'What the file should contain', 'Qué debe contener el archivo'],
  'onb.importRule1': ['Une ligne par poste, avec le libellé puis le montant : « Loyer : 580 € ». Les séparateurs deux-points, point-virgule et tabulation fonctionnent.', 'One line per item, label then amount: "Rent: 580". Colon, semicolon and tab separators all work.', 'Una línea por concepto, concepto y luego importe: «Alquiler: 580». Sirven dos puntos, punto y coma o tabulación.'],
  'onb.importRule2': ['Vos revenus sont reconnus par leur libellé : salaire, prime, aide, allocation, budget.', 'Income is recognised by its label: salary, bonus, benefit, allowance, budget.', 'Los ingresos se reconocen por el concepto: salario, prima, ayuda, subsidio, presupuesto.'],
  'onb.importRule3': ['Pour un crédit ou un abonnement, ajoutez la fin entre parenthèses : « Prêt auto : 81,02 € (fin juin 2029) ».', 'For a loan or subscription, add the end date in brackets: "Car loan: 81.02 (end June 2029)".', 'Para un préstamo o suscripción, añade el fin entre paréntesis: «Préstamo coche: 81,02 (fin junio 2029)».'],
  'onb.importRule4': ['Les lignes Total, Reste et Solde sont ignorées, elles fausseraient les calculs.', 'Total, Balance and Remaining lines are ignored, they would skew the maths.', 'Las líneas Total, Saldo y Resto se ignoran, falsearían los cálculos.'],
  'onb.importRule5': ['Un relevé bancaire est accepté tel quel : les opérations récurrentes deviennent des charges fixes, le reste des dépenses, les virements reçus des revenus.', 'A bank statement works as is: recurring operations become fixed costs, the rest become expenses, incoming transfers become income.', 'Un extracto bancario vale tal cual: las operaciones recurrentes pasan a gastos fijos, el resto a gastos, y los ingresos recibidos a ingresos.'],
  'onb.importScanned': ["Un PDF issu d'un scan ne contient pas de texte lisible, la saisie manuelle sera nécessaire.", 'A scanned PDF has no readable text, manual entry will be needed.', 'Un PDF escaneado no tiene texto legible, habrá que introducirlo a mano.'],
  'onb.noFile': ['Pas de fichier sous la main ? Continuez, la saisie se fait en deux écrans.', 'No file handy? Carry on, entry takes two screens.', '¿No tienes archivo? Continúa, se introduce en dos pantallas.'],
  'onb.importReading': ['Lecture de {f} en cours, cela prend quelques secondes.', 'Reading {f}, this takes a few seconds.', 'Leyendo {f}, tarda unos segundos.'],
  'onb.importNothing': ["Aucune ligne exploitable trouvée. Si le PDF vient d'un scan, son texte n'est pas lisible : passez par la saisie manuelle, elle prend deux minutes.", 'No usable lines found. If the PDF is a scan its text cannot be read: use manual entry, it takes two minutes.', 'No se han encontrado líneas utilizables. Si el PDF es un escaneo no tiene texto: usa la entrada manual, tarda dos minutos.'],
  'onb.importFailed': ["Ce fichier n'a pas pu être lu. Vérifiez son format, ou saisissez vos lignes à la main.", 'This file could not be read. Check the format, or enter your lines manually.', 'No se ha podido leer el archivo. Revisa el formato o introduce las líneas a mano.'],
  'onb.importTooBig': ['Ce fichier dépasse 5 Mo. Réduisez-le ou saisissez vos lignes à la main.', 'This file is over 5 MB. Shrink it or enter your lines manually.', 'El archivo supera los 5 MB. Redúcelo o introduce las líneas a mano.'],
  'onb.importDone': ['{n} ligne(s) importée(s)', '{n} line(s) imported', '{n} línea(s) importada(s)'],
  'onb.importBanner': ['{n} ligne(s) importée(s) depuis votre fichier. Vérifiez les montants et la nature, le crayon permet de corriger une ligne.', '{n} line(s) imported from your file. Check the amounts and types, the pencil lets you fix a line.', '{n} línea(s) importada(s) de tu archivo. Revisa importes y naturaleza, el lápiz permite corregir.'],
  'onb.statementDetected': ['Relevé bancaire détecté. Les opérations qui reviennent chaque mois sont proposées en charges fixes, les autres en dépenses.', 'Bank statement detected. Operations that repeat monthly are proposed as fixed costs, the others as expenses.', 'Extracto bancario detectado. Las operaciones mensuales se proponen como gastos fijos, el resto como gastos.'],
  'onb.incomeTitle': ["Vos entrées d'argent", 'Your income', 'Tus ingresos'],
  'onb.incomeText': ['Salaire, primes, aides, revenus complémentaires. Ajoutez chaque ligne qui alimente votre compte ce mois-ci.', 'Salary, bonuses, benefits, side income. Add every line that feeds your account this month.', 'Salario, primas, ayudas, ingresos extra. Añade cada línea que entra en tu cuenta este mes.'],
  'onb.incomeAdd': ['Ajouter cette entrée', 'Add this income', 'Añadir este ingreso'],
  'onb.incomeEmpty': ['Aucune entrée pour l\'instant', 'No income yet', 'Aún sin ingresos'],
  'onb.incomeEmptyHelp': ['Ajoutez au moins votre salaire pour que le reste à vivre ait un sens.', 'Add at least your salary so the disposable income means something.', 'Añade al menos tu salario para que el disponible tenga sentido.'],
  'onb.incomeNeeded': ["Ajoutez au moins une entrée d'argent", 'Add at least one income line', 'Añade al menos un ingreso'],
  'onb.yourIncome': ['Vos entrées', 'Your income', 'Tus ingresos'],
  'onb.chargesTitle': ['Vos charges fixes', 'Your fixed costs', 'Tus gastos fijos'],
  'onb.chargesText': ["Tout ce qui part automatiquement chaque mois. La nature est proposée d'après le libellé, corrigez-la si besoin.", 'Everything that leaves automatically each month. The type is suggested from the label, correct it if needed.', 'Todo lo que sale automáticamente cada mes. La naturaleza se propone según el concepto, corrígela si hace falta.'],
  'onb.chargesAdd': ['Ajouter cette charge', 'Add this cost', 'Añadir este gasto'],
  'onb.chargesEmpty': ['Aucune charge saisie', 'No fixed costs yet', 'Sin gastos fijos'],
  'onb.chargesEmptyHelp': ["Commencez par le loyer, l'énergie et les crédits, ce sont les plus lourds.", 'Start with rent, utilities and loans, they weigh the most.', 'Empieza por el alquiler, la energía y los préstamos, son los mayores.'],
  'onb.yourCharges': ['Vos charges', 'Your fixed costs', 'Tus gastos fijos'],
  'onb.expensesImported': ['{n} dépense(s) du mois reprises de votre relevé', '{n} expense(s) taken from your statement', '{n} gasto(s) del mes tomados de tu extracto'],
  'onb.recapTitle': ['Votre mois, en résumé', 'Your month at a glance', 'Tu mes, en resumen'],
  'onb.recapText': ["Voici ce que donne votre budget. Vous pourrez tout modifier ensuite, rien n'est figé.", 'Here is your budget. You can change everything later, nothing is locked.', 'Este es tu presupuesto. Podrás cambiarlo todo después, nada es fijo.'],
  'onb.recapIncome': ['Entrées du mois', 'Income this month', 'Ingresos del mes'],
  'onb.recapDaily': ["Soit environ {m} par jour pour les courses, l'essence et les imprévus.", 'That is about {m} a day for groceries, fuel and surprises.', 'Unos {m} al día para la compra, la gasolina y los imprevistos.'],
  'onb.recapDebt': ["Vos crédits représentent {p} de vos entrées. Au delà de 35 %, les banques parlent de taux d'endettement élevé.", 'Your loans are {p} of your income. Above 35% banks consider the ratio high.', 'Tus préstamos son el {p} de tus ingresos. Por encima del 35 % los bancos lo consideran alto.'],
  'onb.recapNegative': ["Vos charges dépassent vos entrées. Vérifiez qu'aucune ligne n'a été saisie en double avant de continuer.", 'Your costs exceed your income. Check for duplicate lines before continuing.', 'Tus gastos superan tus ingresos. Comprueba que no haya líneas duplicadas.'],
  'onb.savingsGoalHelp': ['Facultatif. Il apparaîtra comme repère sur votre tableau de bord.', 'Optional. It shows as a marker on your dashboard.', 'Opcional. Aparecerá como referencia en tu panel.'],
  'onb.finish': ['Ouvrir mon tableau de bord', 'Open my dashboard', 'Abrir mi panel'],
  'onb.saving': ['Enregistrement', 'Saving', 'Guardando'],

  /* ---------- Authentification ---------- */
  'auth.signIn': ['Se connecter', 'Sign in', 'Iniciar sesión'],
  'auth.signUp': ['Créer un compte', 'Create account', 'Crear cuenta'],
  'auth.welcomeBack': ['Bon retour', 'Welcome back', 'Bienvenido de nuevo'],
  'auth.welcomeBackText': ['Entrez vos identifiants pour retrouver votre tableau de bord.', 'Enter your details to get back to your dashboard.', 'Introduce tus datos para volver a tu panel.'],
  'auth.createTitle': ['Créer votre compte', 'Create your account', 'Crea tu cuenta'],
  'auth.createText': ['Deux champs, et vous passez à la mise en route de votre budget.', 'Two fields, then straight to setting up your budget.', 'Dos campos y pasas a configurar tu presupuesto.'],
  'auth.email': ['Adresse e-mail', 'Email address', 'Correo electrónico'],
  'auth.password': ['Mot de passe', 'Password', 'Contraseña'],
  'auth.passwordPlaceholder': ['Au moins 10 caractères', 'At least 10 characters', 'Al menos 10 caracteres'],
  'auth.show': ['Voir', 'Show', 'Ver'],
  'auth.hide': ['Cacher', 'Hide', 'Ocultar'],
  'auth.consent': ["J'accepte la politique de confidentialité", 'I accept the privacy policy', 'Acepto la política de privacidad'],
  'auth.consentNeeded': ['Cochez la case pour continuer.', 'Tick the box to continue.', 'Marca la casilla para continuar.'],
  'auth.forgot': ['Mot de passe oublié', 'Forgot password', 'He olvidado mi contraseña'],
  'auth.backHome': ["Retour à l'accueil", 'Back to home', 'Volver al inicio'],
  'auth.badEmail': ["Cette adresse e-mail n'est pas valide.", 'This email address is not valid.', 'Este correo no es válido.'],
  'auth.shortPassword': ['Le mot de passe doit contenir au moins 10 caractères.', 'The password must be at least 10 characters.', 'La contraseña debe tener al menos 10 caracteres.'],
  'auth.needLetterDigit': ['Ajoutez au moins une lettre et un chiffre à votre mot de passe.', 'Add at least one letter and one digit to your password.', 'Añade al menos una letra y un número.'],
  'auth.tooCommon': ['Ce mot de passe est trop courant. Choisissez une phrase de passe personnelle.', 'This password is too common. Choose a personal passphrase.', 'Esta contraseña es demasiado común. Elige una frase personal.'],
  'auth.checkEmail': ['Compte créé. Ouvrez votre boîte e-mail et cliquez sur le lien de confirmation pour activer votre accès.', 'Account created. Open your inbox and click the confirmation link to activate access.', 'Cuenta creada. Abre tu correo y pulsa el enlace de confirmación para activar el acceso.'],
  'auth.resetSent': ['Si un compte existe avec cette adresse, un lien de réinitialisation vient de partir. Vérifiez aussi vos indésirables.', 'If an account exists for this address, a reset link has been sent. Check your spam folder too.', 'Si existe una cuenta con esa dirección, se ha enviado un enlace. Revisa también el spam.'],
  'auth.enterEmailFirst': ['Entrez votre adresse e-mail dans le champ ci-dessus, puis cliquez à nouveau.', 'Enter your email address above, then click again.', 'Introduce tu correo arriba y vuelve a pulsar.'],
  'auth.newPasswordTitle': ['Nouveau mot de passe', 'New password', 'Nueva contraseña'],
  'auth.newPasswordText': ["Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.", 'Choose a password you use nowhere else.', 'Elige una contraseña que no uses en ningún otro sitio.'],
  'auth.savePassword': ['Enregistrer le mot de passe', 'Save password', 'Guardar contraseña'],
  'auth.signingIn': ['Connexion en cours', 'Signing in', 'Conectando'],
  'auth.creating': ['Création en cours', 'Creating account', 'Creando cuenta'],
  'auth.tagline': ['Le mois commence, votre budget aussi.', 'A new month, a fresh budget.', 'Empieza el mes, empieza tu presupuesto.'],
  'auth.taglineText': ['Charges fixes, crédits, abonnements et dépenses du quotidien. Un seul écran pour savoir ce qu\'il vous reste réellement.', 'Fixed costs, loans, subscriptions and daily spending. One screen to know what is really left.', 'Gastos fijos, préstamos, suscripciones y gastos diarios. Una pantalla para saber lo que queda.'],
  'auth.passwordSafe': ["Votre mot de passe est chiffré à l'inscription. Personne, pas même l'éditeur du site, ne peut le lire.", 'Your password is hashed at sign-up. Nobody, not even the site owner, can read it.', 'Tu contraseña se cifra al registrarte. Nadie, ni el editor del sitio, puede leerla.']
};

const CLE_STOCKAGE = 'ctrl-budget-langue';

function detecter() {
  const enregistree = localStorage.getItem(CLE_STOCKAGE);
  if (enregistree && LANGUES[enregistree]) return enregistree;
  const navigateur = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return LANGUES[navigateur] ? navigateur : 'fr';
}

let langue = detecter();

export const langueCourante = () => langue;
export const localeCourante = () => LANGUES[langue].locale;

export function setLangue(code) {
  if (!LANGUES[code]) return;
  langue = code;
  localStorage.setItem(CLE_STOCKAGE, code);
  document.documentElement.lang = code;
}

/* Traduit une clé. Les variables {x} sont remplacées, et « (s) » ou
   « (ies) » est résolu selon la variable n. */
export function t(cle, vars = {}) {
  const entree = DICT[cle];
  let texte = entree ? entree[ORDRE.indexOf(langue)] || entree[0] : cle;

  Object.entries(vars).forEach(([nom, valeur]) => {
    texte = texte.replaceAll(`{${nom}}`, String(valeur));
  });

  if (vars.n !== undefined) {
    const pluriel = Number(vars.n) > 1;
    texte = texte
      .replace(/\(s\)/g, pluriel ? 's' : '')
      .replace(/\(es\)/g, pluriel ? 'es' : '');
  } else {
    texte = texte.replace(/\((?:s|es)\)/g, '');
  }

  return texte;
}

document.documentElement.lang = langue;
