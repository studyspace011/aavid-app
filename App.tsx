import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Type Definitions
type Subject = {
  id: string;
  name: string;
  topics: Topic[];
};

type Topic = {
  id: string;
  name: string;
  notes: string;
  vviPoints: string[];
  status: 'to_study' | 'studied' | 'to_revise';
  revisionDates: string[]; // ISO date strings for R1, R2, R3, R4, R5
};

type MoodEntry = {
  date: string; // ISO date string
  mood: 'studied' | 'skipped' | 'bad_focus' | 'strong_study';
};

type Mistake = {
  id: string;
  topicName: string;
  mistakeDetail: string;
  dateAdded: string; // ISO date string
};

type WeeklySchedule = {
  day: string;
  subjectId: string;
  suggestedTopicName: string;
};

// Initial Data
const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'mjc3_macro',
    name: 'MJC-3: Macroeconomics',
    topics: [
      { id: 'gdp', name: 'GDP', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
      { id: 'fiscal_policy', name: 'Fiscal Policy', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
      { id: 'monetary_policy', name: 'Monetary Policy', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
    ],
  },
  {
    id: 'mic3_history',
    name: 'MIC-3: History',
    topics: [
      { id: 'indus_valley', name: 'Indus Valley Civilization', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
      { id: 'gupta_empire', name: 'Gupta Empire', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
    ],
  },
  {
    id: 'mjc4_statistics',
    name: 'MJC-4: Statistics',
    topics: [
      { id: 'mean_median_mode', name: 'Mean, Median, Mode', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
    ],
  },
  {
    id: 'mdc3_hindi',
    name: 'MDC-3: Hindi',
    topics: [
      { id: 'grammar', name: 'Grammar Basics', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
    ],
  },
  {
    id: 'sec3_aec3_light',
    name: 'SEC-3 / AEC-3 (Light Subjects)',
    topics: [
      { id: 'env_basics', name: 'Environmental Basics', notes: '', vviPoints: [], status: 'to_study', revisionDates: [] },
    ],
  },
  {
    id: 'recap_all',
    name: 'Recap All Subjects',
    topics: [], // No specific topics, just for recap or general review
  },
  {
    id: 'test_revision',
    name: 'Test + Revision',
    topics: [], // No specific topics, just for test/revision
  },
];

const WEEKLY_SCHEDULE: WeeklySchedule[] = [
  { day: 'Monday', subjectId: 'mjc3_macro', suggestedTopicName: 'GDP' },
  { day: 'Tuesday', subjectId: 'mic3_history', suggestedTopicName: 'Indus Valley Civilization' },
  { day: 'Wednesday', subjectId: 'mjc4_statistics', suggestedTopicName: 'Mean, Median, Mode' },
  { day: 'Thursday', subjectId: 'mdc3_hindi', suggestedTopicName: 'Grammar Basics' },
  { day: 'Friday', subjectId: 'sec3_aec3_light', suggestedTopicName: 'Environmental Basics' },
  { day: 'Saturday', subjectId: 'recap_all', suggestedTopicName: 'Review all pending topics' },
  { day: 'Sunday', subjectId: 'test_revision', suggestedTopicName: 'Take a test & review mistakes' },
];

const MOTIVATIONAL_QUOTES: string[] = [
  "The only way to do great work is to love what you do.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Believe you can and you're halfway there.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Strive for progress, not perfection.",
];

// Helper functions for dates
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getIsoDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getDayName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

// NavItem Component
interface NavItemProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ children, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 mx-1 mb-1
        ${active ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
    >
      {children}
    </button>
  );
};

// Main App Component
const AavidStudyApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home'); // home, planner, notes, test, mistakes, mood, motivation, aic_chat, flashcards, voice_notes
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const savedSubjects = localStorage.getItem('aavid_subjects');
    return savedSubjects ? JSON.parse(savedSubjects) : INITIAL_SUBJECTS;
  });
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(() => {
    const savedMoods = localStorage.getItem('aavid_mood_entries');
    return savedMoods ? JSON.parse(savedMoods) : [];
  });
  const [mistakes, setMistakes] = useState<Mistake[]>(() => {
    const savedMistakes = localStorage.getItem('aavid_mistakes');
    return savedMistakes ? JSON.parse(savedMistakes) : [];
  });
  const [favoriteQuotes, setFavoriteQuotes] = useState<string[]>(() => {
    const savedQuotes = localStorage.getItem('aavid_favorite_quotes');
    return savedQuotes ? JSON.parse(savedQuotes) : [];
  });

  const [currentDate] = useState<Date>(new Date()); // Fixed current date for app session
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null); // For notes/test/revision view

  const [notesInput, setNotesInput] = useState<string>('');
  const [vviInput, setVviInput] = useState<string>('');
  const [newMistakeInput, setNewMistakeInput] = useState<string>('');
  const [newPersonalQuoteInput, setNewPersonalQuoteInput] = useState<string>('');

  // Daily notification state (simulated)
  const [dailyNotification, setDailyNotification] = useState<string>('');

  // Save state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('aavid_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('aavid_mood_entries', JSON.stringify(moodEntries));
  }, [moodEntries]);

  useEffect(() => {
    localStorage.setItem('aavid_mistakes', JSON.stringify(mistakes));
  }, [mistakes]);

  useEffect(() => {
    localStorage.setItem('aavid_favorite_quotes', JSON.stringify(favoriteQuotes));
  }, [favoriteQuotes]);

  // Set initial selected subject and topic for notes based on current day's schedule
  useEffect(() => {
    const todayDay = getDayName(currentDate);
    const scheduledDay = WEEKLY_SCHEDULE.find(s => s.day === todayDay);
    if (scheduledDay) {
      setSelectedSubjectId(scheduledDay.subjectId);
      const subject = subjects.find(s => s.id === scheduledDay.subjectId);
      if (subject && subject.topics.length > 0) {
        const topic = subject.topics.find(t => t.name === scheduledDay.suggestedTopicName);
        setSelectedTopicId(topic ? topic.id : subject.topics[0].id);
      } else {
        setSelectedTopicId(null);
      }
    } else {
      // Default to first subject if no schedule found for today
      setSelectedSubjectId(subjects[0].id);
      setSelectedTopicId(subjects[0].topics.length > 0 ? subjects[0].topics[0].id : null);
    }
  }, [currentDate, subjects]);

  // Simulate daily notifications for spaced repetition
  useEffect(() => {
    const todayIso = getIsoDateString(currentDate);
    let revisionsToday: string[] = [];

    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        const relevantRevisionDate = topic.revisionDates.find(date => date === todayIso);
        if (relevantRevisionDate) {
            // Check if it's the very first revision (Day 1) or a later one
            const isFirstRevision = topic.revisionDates[0] === todayIso;
            const revisionType = isFirstRevision ? 'New Study (R1)' : `Revision (R${topic.revisionDates.indexOf(todayIso) + 1})`;
            revisionsToday.push(`${topic.name} (${revisionType})`);
        }
      });
    });

    if (revisionsToday.length > 0) {
      setDailyNotification(`Today's focus: ${revisionsToday.join(', ')}`);
    } else {
      setDailyNotification('No specific revisions scheduled for today. Focus on new topics!');
    }
  }, [currentDate, subjects]);

  // Helper to find current subject and topic
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const currentTopic = currentSubject?.topics.find(t => t.id === selectedTopicId);

  // Update notes/vvi input fields when topic changes
  useEffect(() => {
    if (currentTopic) {
      setNotesInput(currentTopic.notes);
      setVviInput(currentTopic.vviPoints.join('\n'));
    } else {
      setNotesInput('');
      setVviInput('');
    }
  }, [currentTopic]); // Only update when selectedTopicId changes (via currentTopic)

  // Spaced Repetition Logic
  const handleMarkAsStudied = (subjectId: string, topicId: string) => {
    setSubjects(prevSubjects =>
      prevSubjects.map(subject =>
        subject.id === subjectId
          ? {
              ...subject,
              topics: subject.topics.map(topic => {
                if (topic.id === topicId) {
                  const today = new Date();
                  const r1 = getIsoDateString(addDays(today, 0)); // Day 1
                  const r2 = getIsoDateString(addDays(today, 2)); // Day 3
                  const r3 = getIsoDateString(addDays(today, 6)); // Day 7
                  const r4 = getIsoDateString(addDays(today, 14)); // Day 15
                  const r5 = getIsoDateString(addDays(today, 29)); // Day 30

                  return {
                    ...topic,
                    status: 'studied',
                    revisionDates: [r1, r2, r3, r4, r5],
                  };
                }
                return topic;
              }),
            }
          : subject,
      ),
    );
    alert('Topic marked as studied! Revisions scheduled.');
  };

  // Update Notes and VVI
  const handleSaveNotes = () => {
    if (!currentSubject || !currentTopic) {
        alert('Please select a topic to save notes.');
        return;
    }

    setSubjects(prevSubjects =>
      prevSubjects.map(subject =>
        subject.id === selectedSubjectId
          ? {
              ...subject,
              topics: subject.topics.map(topic =>
                topic.id === selectedTopicId
                  ? {
                      ...topic,
                      notes: notesInput,
                      vviPoints: vviInput.split('\n').filter(line => line.trim() !== ''),
                    }
                  : topic,
              ),
            }
          : subject,
      ),
    );
    alert('Notes and VVI points saved!');
  };

  const handleUpdateTopicStatus = (status: 'completed' | 'to_revise') => {
    if (!currentSubject || !currentTopic) {
        alert('Please select a topic to update its status.');
        return;
    }

    setSubjects(prevSubjects =>
      prevSubjects.map(subject =>
        subject.id === selectedSubjectId
          ? {
              ...subject,
              topics: subject.topics.map(topic =>
                topic.id === selectedTopicId
                  ? {
                      ...topic,
                      status: status === 'completed' ? 'studied' : 'to_revise', // Map to internal states
                  }
                  : topic,
              ),
            }
          : subject,
      ),
    );
    alert(`Topic marked as ${status}.`);
  };

  // Mini Test Generator
  const generateQuestions = (): { mcqs: string[], shortAnswers: string[] } => {
    if (!currentTopic) {
      return { mcqs: [], shortAnswers: [] };
    }
    // Simulate AI generation based on topic name
    const topicName = currentTopic.name;
    const mcqs = [
      `Q1: What is a key concept related to ${topicName}? (A) Opt1 (B) Opt2 (C) Opt3 (D) Opt4`,
      `Q2: Which of the following is true about ${topicName}? (A) True1 (B) True2 (C) True3 (D) True4`,
      `Q3: When did ${topicName} primarily occur/become relevant? (A) Date1 (B) Date2 (C) Date3 (D) Date4`,
    ];
    const shortAnswers = [
      `Q4: Explain the main principles of ${topicName}.`,
      `Q5: Discuss the significance of ${topicName} in its context.`,
    ];
    return { mcqs, shortAnswers };
  };

  const [generatedQuestions, setGeneratedQuestions] = useState<{ mcqs: string[], shortAnswers: string[] } | null>(null);

  const handleGenerateTest = () => {
    if (!currentTopic) {
        alert('Please select a topic to generate questions.');
        return;
    }
    setGeneratedQuestions(generateQuestions());
    alert('5 questions generated!');
  };

  // Mistake Tracker
  const handleAddMistake = () => {
    if (newMistakeInput.trim() === '') {
      alert('Please enter a mistake to add.');
      return;
    }
    const newMistake: Mistake = {
      id: Date.now().toString(),
      topicName: currentTopic ? currentTopic.name : 'General',
      mistakeDetail: newMistakeInput.trim(),
      dateAdded: getIsoDateString(new Date()),
    };
    setMistakes(prev => [...prev, newMistake]);
    setNewMistakeInput('');
    alert('Mistake added!');
  };

  // Mood and Routine Tracker
  const handleMoodCheckIn = (mood: MoodEntry['mood']) => {
    const todayIso = getIsoDateString(currentDate);
    const existingEntryIndex = moodEntries.findIndex(entry => entry.date === todayIso);

    if (existingEntryIndex > -1) {
      // Update existing entry
      setMoodEntries(prev => {
        const newEntries = [...prev];
        newEntries[existingEntryIndex] = { date: todayIso, mood };
        return newEntries;
      });
    } else {
      // Add new entry
      setMoodEntries(prev => [...prev, { date: todayIso, mood }]);
    }
    alert(`Mood for today (${mood}) recorded!`);
  };

  // Prepare data for Mood Graph (last 7 days)
  const getMoodGraphData = () => {
    const data: { name: string; studied: number; skipped: number; bad_focus: number; strong_study: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDays(currentDate, -i);
      const isoDate = getIsoDateString(date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const entry = moodEntries.find(m => m.date === isoDate);

      data.push({
        name: dayName,
        studied: entry?.mood === 'studied' ? 1 : 0,
        skipped: entry?.mood === 'skipped' ? 1 : 0,
        bad_focus: entry?.mood === 'bad_focus' ? 1 : 0,
        strong_study: entry?.mood === 'strong_study' ? 1 : 0,
      });
    }
    return data;
  };

  // Motivational Zone
  const [dailyQuote, setDailyQuote] = useState<string>('');
  useEffect(() => {
    setDailyQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
  }, [activeTab]); // Change quote when visiting motivation tab

  const handleSavePersonalQuote = () => {
    if (newPersonalQuoteInput.trim() === '') {
      alert('Please enter a quote.');
      return;
    }
    setFavoriteQuotes(prev => [...prev, newPersonalQuoteInput.trim()]);
    setNewPersonalQuoteInput('');
    alert('Quote saved!');
  };

  const handleGetAIChatResponse = (query: string): string => {
    // Simulate AI response
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('gdp')) {
      return "GDP (Gross Domestic Product) is the total monetary or market value of all the finished goods and services produced within a country's borders in a specific time period.";
    } else if (lowerQuery.includes('fiscal policy')) {
      return "Fiscal policy involves the use of government spending and taxation to influence the economy. It's used to stabilize the economy, control inflation, and reduce unemployment.";
    } else if (lowerQuery.includes('encourage me')) {
        return "You're doing great, Aavid! Every small step forward is progress. Keep pushing, consistency beats perfection. You've got this!";
    } else if (lowerQuery.includes('study tips')) {
        return "Remember to take short breaks, actively recall information, and connect new concepts to what you already know. Spaced repetition is your best friend!";
    }
    return "I'm a simulated AI. Please ask about 'GDP', 'Fiscal Policy', 'Encourage me', or 'Study tips' for specific responses, otherwise, I'll give a generic one.";
  };

  const [aiChatInput, setAiChatInput] = useState<string>('');
  const [aiChatResponse, setAiChatResponse] = useState<string>('');
  const handleAIChatSubmit = () => {
    setAiChatResponse(handleGetAIChatResponse(aiChatInput));
  };

  // Flashcard mode (simulated)
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState<boolean>(false);

  const allTopicsForFlashcards: Topic[] = subjects.flatMap(s => s.topics).filter(t => t.notes.trim() !== '' || t.vviPoints.length > 0);
  const currentFlashcard = allTopicsForFlashcards[flashcardIndex];

  const handleNextFlashcard = () => {
    setShowFlashcardAnswer(false);
    setFlashcardIndex(prev => (prev + 1) % allTopicsForFlashcards.length);
  };
  const handlePrevFlashcard = () => {
    setShowFlashcardAnswer(false);
    setFlashcardIndex(prev => (prev - 1 + allTopicsForFlashcards.length) % allTopicsForFlashcards.length);
  };

  // Weekly Report Card (simulated)
  const generateWeeklyReport = () => {
    const today = currentDate;
    const sevenDaysAgo = addDays(today, -6); // Inclusive of today, covers 7 days total

    const relevantMoodEntries = moodEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      // Compare date parts only, ignore time
      return getIsoDateString(entryDate) >= getIsoDateString(sevenDaysAgo) && getIsoDateString(entryDate) <= getIsoDateString(today);
    });

    const studiedCount = relevantMoodEntries.filter(e => e.mood === 'studied' || e.mood === 'strong_study').length;
    const skippedCount = relevantMoodEntries.filter(e => e.mood === 'skipped' || e.mood === 'bad_focus').length;
    const totalDaysTracked = new Set(relevantMoodEntries.map(e => e.date)).size; // Count unique days

    const topicsTouchedThisWeek = new Set<string>();
    subjects.forEach(subject => {
      subject.topics.forEach(topic => {
        topic.revisionDates.forEach(dateStr => {
          const revDate = new Date(dateStr);
          if (getIsoDateString(revDate) >= getIsoDateString(sevenDaysAgo) && getIsoDateString(revDate) <= getIsoDateString(today)) {
            topicsTouchedThisWeek.add(topic.name);
          }
        });
      });
    });

    const mistakesLoggedThisWeek = mistakes.filter(m => {
        const mistakeDate = new Date(m.dateAdded);
        return getIsoDateString(mistakeDate) >= getIsoDateString(sevenDaysAgo) && getIsoDateString(mistakeDate) <= getIsoDateString(today);
    }).length;

    const report = `
      --- Weekly Study Report (${getIsoDateString(sevenDaysAgo)} to ${getIsoDateString(today)}) ---
      Days tracked for mood: ${totalDaysTracked}
      Days studied effectively: ${studiedCount}
      Days skipped/bad focus: ${skippedCount}
      Unique topics touched/revised: ${topicsTouchedThisWeek.size}
      Mistakes logged this week: ${mistakesLoggedThisWeek}

      Keep up the great work, Aavid! Consistency is key.
    `;
    alert(report);
  };

  // Dynamic content based on activeTab
  const renderContent = () => {
    const todayDay = getDayName(currentDate);
    const scheduledDay = WEEKLY_SCHEDULE.find(s => s.day === todayDay);
    const currentDaySubject = subjects.find(s => s.id === scheduledDay?.subjectId);
    const currentDayTopic = currentDaySubject?.topics.find(t => t.name === scheduledDay?.suggestedTopicName);

    switch (activeTab) {
      case 'home':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Welcome, Aavid!</h2>
            <div className="bg-indigo-100 p-4 rounded-lg text-indigo-800">
              <p className="font-semibold text-lg">Today's Focus: {scheduledDay?.subjectId ? subjects.find(s => s.id === scheduledDay.subjectId)?.name : 'No subject assigned'}</p>
              <p className="text-sm">Suggested Topic: {currentDayTopic?.name || scheduledDay?.suggestedTopicName || 'N/A'}</p>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg text-gray-700 text-sm">
              <p className="font-medium">Daily Update:</p>
              <p>{dailyNotification}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => setActiveTab('planner')} className="flex-1 min-w-max bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                View Planner
              </button>
              <button onClick={() => setActiveTab('notes')} className="flex-1 min-w-max bg-emerald-600 text-white py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-200">
                Start Studying
              </button>
            </div>
          </div>
        );

      case 'planner':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Daily Subject Planner</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WEEKLY_SCHEDULE.map((item) => (
                <div key={item.day} className={`p-4 rounded-lg border-2 ${item.day === todayDay ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <h3 className="font-semibold text-lg text-gray-800">{item.day}</h3>
                  <p className="text-gray-700">{subjects.find(s => s.id === item.subjectId)?.name}</p>
                  <p className="text-gray-600 text-sm">Topic: {item.suggestedTopicName}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'notes':
        const subjectsWithTopics = subjects.filter(s => s.topics.length > 0);
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Notes & VVI Section</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                className="flex-1 min-w-40 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const newSubject = subjects.find(s => s.id === e.target.value);
                  setSelectedTopicId(newSubject && newSubject.topics.length > 0 ? newSubject.topics[0].id : null);
                }}
              >
                {subjectsWithTopics.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {currentSubject && currentSubject.topics.length > 0 ? (
                <select
                  className="flex-1 min-w-40 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedTopicId || ''}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                >
                  {currentSubject.topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex-1 min-w-40 p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">No topics available</div>
              )}
            </div>

            {currentTopic ? (
              <>
                <div className="space-y-3">
                  <label htmlFor="notes" className="block text-gray-700 font-medium">Notes for {currentTopic.name}:</label>
                  <textarea
                    id="notes"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-32"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Enter your notes here. You can paste links (e.g., https://docs.google.com/document/d/123) or key points."
                  ></textarea>

                  <label htmlFor="vvi-points" className="block text-gray-700 font-medium">VVI Points (one per line):</label>
                  <textarea
                    id="vvi-points"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-24"
                    value={vviInput}
                    onChange={(e) => setVviInput(e.target.value)}
                    placeholder="Enter Very Very Important points here, one per line."
                  ></textarea>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={handleSaveNotes}
                    className="flex-1 min-w-max bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Save Notes
                  </button>
                  <button
                    onClick={() => handleMarkAsStudied(selectedSubjectId, currentTopic.id)}
                    className="flex-1 min-w-max bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors duration-200"
                  >
                    Mark as Studied
                  </button>
                  <button
                    onClick={() => handleUpdateTopicStatus('to_revise')}
                    className="flex-1 min-w-max bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors duration-200"
                  >
                    Mark as To Revise
                  </button>
                  <button
                    onClick={() => handleUpdateTopicStatus('completed')}
                    className="flex-1 min-w-max bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    Mark as Completed
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-600 italic">Please select a subject and topic to view/edit notes.</p>
            )}
          </div>
        );

      case 'test':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Mini Test Generator</h2>
            <div className="flex flex-wrap gap-2 mb-4">
            <select
                className="flex-1 min-w-40 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  const newSubject = subjects.find(s => s.id === e.target.value);
                  setSelectedTopicId(newSubject && newSubject.topics.length > 0 ? newSubject.topics[0].id : null);
                  setGeneratedQuestions(null); // Clear questions on subject/topic change
                }}
              >
                {subjects.filter(s => s.topics.length > 0).map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {currentSubject && currentSubject.topics.length > 0 ? (
                <select
                  className="flex-1 min-w-40 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={selectedTopicId || ''}
                  onChange={(e) => {
                    setSelectedTopicId(e.target.value);
                    setGeneratedQuestions(null); // Clear questions on topic change
                  }}
                >
                  {currentSubject.topics.map(topic => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex-1 min-w-40 p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500">No topics available</div>
              )}
            </div>

            {currentTopic ? (
              <>
                <button
                  onClick={handleGenerateTest}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-semibold"
                >
                  Generate 5 Questions for {currentTopic.name}
                </button>

                {generatedQuestions && (
                  <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">Generated Questions:</h3>
                    <div className="space-y-2">
                      {generatedQuestions.mcqs.map((q, index) => (
                        <p key={`mcq-${index}`} className="text-gray-700">{q}</p>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {generatedQuestions.shortAnswers.map((q, index) => (
                        <p key={`sa-${index}`} className="text-gray-700">{q}</p>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setNewMistakeInput(`Failed a question on ${currentTopic.name} during test.`);
                        setActiveTab('mistakes');
                      }}
                      className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors duration-200 mt-4"
                    >
                      Add Test Mistake
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-600 italic">Please select a subject and topic to generate a test.</p>
            )}
          </div>
        );

      case 'mistakes':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Mistake Tracker</h2>
            <div className="mb-4">
              <label htmlFor="add-mistake" className="block text-gray-700 font-medium mb-2">Add a new mistake:</label>
              <textarea
                id="add-mistake"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-24"
                value={newMistakeInput}
                onChange={(e) => setNewMistakeInput(e.target.value)}
                placeholder="e.g., 'Confused GDP vs GNP in Macroeconomics', 'Forgot dates for Battle of Panipat'"
              ></textarea>
              <button
                onClick={handleAddMistake}
                className="mt-3 w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors duration-200 font-semibold"
              >
                Add to Mistake List
              </button>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Weak Areas:</h3>
              {mistakes.length === 0 ? (
                <p className="text-gray-600 italic">No mistakes added yet. Keep track of what you struggle with!</p>
              ) : (
                <ul className="space-y-2">
                  {mistakes.map(mistake => (
                    <li key={mistake.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-red-800 font-medium">{mistake.mistakeDetail}</p>
                        <p className="text-red-600 text-sm">({mistake.topicName}, {mistake.dateAdded})</p>
                      </div>
                      <button
                        onClick={() => setMistakes(prev => prev.filter(m => m.id !== mistake.id))}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Resolve
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      case 'mood':
        const moodGraphData = getMoodGraphData();
        const currentMood = moodEntries.find(entry => entry.date === getIsoDateString(currentDate))?.mood || null;

        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Mood & Routine Tracker</h2>
            <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-gray-700 font-medium mb-2">How was your study today ({getIsoDateString(currentDate)})?</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => handleMoodCheckIn('studied')}
                  className={`py-3 px-4 rounded-lg text-white font-semibold transition-colors duration-200 ${currentMood === 'studied' ? 'bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  ✅ I studied
                </button>
                <button
                  onClick={() => handleMoodCheckIn('skipped')}
                  className={`py-3 px-4 rounded-lg text-white font-semibold transition-colors duration-200 ${currentMood === 'skipped' ? 'bg-red-700' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  😴 I skipped
                </button>
                <button
                  onClick={() => handleMoodCheckIn('bad_focus')}
                  className={`py-3 px-4 rounded-lg text-white font-semibold transition-colors duration-200 ${currentMood === 'bad_focus' ? 'bg-amber-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                  🤯 Bad focus
                </button>
                <button
                  onClick={() => handleMoodCheckIn('strong_study')}
                  className={`py-3 px-4 rounded-lg text-white font-semibold transition-colors duration-200 ${currentMood === 'strong_study' ? 'bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                >
                  💪 Strong study
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Weekly Study Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={moodGraphData}
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" domain={[0, 1]} tickFormatter={(value) => value === 1 ? 'Yes' : 'No'} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="studied" stroke="#10b981" name="Studied" dot={{ stroke: '#10b981', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="strong_study" stroke="#6366f1" name="Strong Study" dot={{ stroke: '#6366f1', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="bad_focus" stroke="#f59e0b" name="Bad Focus" dot={{ stroke: '#f59e0b', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="skipped" stroke="#ef4444" name="Skipped" dot={{ stroke: '#ef4444', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 text-center mt-2">1 = Yes, 0 = No for each category on that day.</p>
            </div>
            <button
              onClick={generateWeeklyReport}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors duration-200 mt-4 font-semibold"
            >
              Generate Weekly Report Card
            </button>
          </div>
        );

      case 'motivation':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Motivational Zone</h2>
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-center">
              <p className="text-lg italic text-indigo-800 font-medium">"{dailyQuote}"</p>
            </div>

            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Add Your Personal Quote:</h3>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-24"
                value={newPersonalQuoteInput}
                onChange={(e) => setNewPersonalQuoteInput(e.target.value)}
                placeholder="Enter your favorite motivational quote here..."
              ></textarea>
              <button
                onClick={handleSavePersonalQuote}
                className="mt-3 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-semibold"
              >
                Save Quote
              </button>
            </div>

            {favoriteQuotes.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Saved Quotes:</h3>
                <ul className="space-y-2">
                  {favoriteQuotes.map((quote, index) => (
                    <li key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 flex justify-between items-start">
                      <span className="flex-1 italic">"{quote}"</span>
                      <button
                        onClick={() => setFavoriteQuotes(prev => prev.filter((_, i) => i !== index))}
                        className="ml-2 text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">AI Encouragement:</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ask for encouragement or study tips (e.g., 'Encourage me today')"
                  value={aiChatInput}
                  onChange={(e) => setAiChatInput(e.target.value)}
                />
                <button
                  onClick={handleAIChatSubmit}
                  className="bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  Ask AI
                </button>
              </div>
              {aiChatResponse && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 italic mt-2">
                  {aiChatResponse}
                </div>
              )}
            </div>
          </div>
        );

      case 'aic_chat':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">AI Chat (Simulated Gemini)</h2>
            <div className="flex flex-col gap-3">
              <div className="bg-gray-100 p-3 rounded-lg text-gray-700 min-h-24 flex items-center justify-center">
                <p className="italic">{aiChatResponse || "Type your query below to get a response (e.g., 'What is GDP?', 'Explain fiscal policy', 'Encourage me today')."}</p>
              </div>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-24"
                placeholder="Ask your study doubts here..."
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
              ></textarea>
              <button
                onClick={handleAIChatSubmit}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-semibold"
              >
                Send to AI
              </button>
              <p className="text-sm text-gray-500 text-center">Note: This is a simulated AI. Responses are pre-defined for certain keywords.</p>
            </div>
          </div>
        );

      case 'flashcards':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Flashcard Mode</h2>
            {allTopicsForFlashcards.length === 0 ? (
              <p className="text-gray-600 italic">No topics with notes/VVI points available for flashcards. Add some notes first!</p>
            ) : (
              <div className="space-y-4">
                <div
                  className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 min-h-48 flex flex-col justify-center items-center text-center cursor-pointer"
                  onClick={() => setShowFlashcardAnswer(prev => !prev)}
                >
                  <p className="text-xl font-semibold text-indigo-800 mb-2">{currentFlashcard?.name}</p>
                  {showFlashcardAnswer && (
                    <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm w-full">
                      <p className="text-gray-700 text-left">{currentFlashcard?.notes || "No detailed notes available."}</p>
                      {currentFlashcard?.vviPoints.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 text-left">
                          <p className="font-medium">VVI Points:</p>
                          <ul className="list-disc list-inside">
                            {currentFlashcard.vviPoints.map((point, i) => <li key={i}>{point}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-indigo-600 mt-4">(Tap to {showFlashcardAnswer ? 'hide' : 'show'} notes)</p>
                </div>
                <div className="flex justify-between gap-3">
                  <button
                    onClick={handlePrevFlashcard}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextFlashcard}
                    className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'voice_notes':
        return (
          <div className="p-4 bg-white rounded-xl shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Voice-to-Text Note Taking (Simulated)</h2>
            <div className="bg-gray-100 p-4 rounded-lg text-gray-700 text-center">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                🎙️
              </div>
              <p>Microphone is ready. Start speaking to convert your voice to text notes.</p>
              <button className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200">
                Start Recording
              </button>
              <p className="mt-3 text-sm text-gray-500 italic">"Simulated: This feature would transcribe your speech into the notes section of the currently selected topic."</p>
            </div>
          </div>
        );

      default:
        return <div className="p-4 text-gray-600">Select a module from the navigation.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 flex flex-col items-center py-6 px-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 text-center">
          <h1 className="text-2xl font-bold">Aavid's Study Buddy</h1>
          <p className="text-sm mt-1">"No overload. One subject per day. Repeated smartly. Mastered slowly."</p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center p-3 border-b border-gray-200 bg-white">
          <NavItem active={activeTab === 'home'} onClick={() => setActiveTab('home')}>Home</NavItem>
          <NavItem active={activeTab === 'planner'} onClick={() => setActiveTab('planner')}>Planner</NavItem>
          <NavItem active={activeTab === 'notes'} onClick={() => setActiveTab('notes')}>Notes</NavItem>
          <NavItem active={activeTab === 'test'} onClick={() => setActiveTab('test')}>Test</NavItem>
          <NavItem active={activeTab === 'mistakes'} onClick={() => setActiveTab('mistakes')}>Mistakes</NavItem>
          <NavItem active={activeTab === 'mood'} onClick={() => setActiveTab('mood')}>Mood</NavItem>
          <NavItem active={activeTab === 'motivation'} onClick={() => setActiveTab('motivation')}>Motivation</NavItem>
          <NavItem active={activeTab === 'aic_chat'} onClick={() => setActiveTab('aic_chat')}>AI Chat</NavItem>
          <NavItem active={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')}>Flashcards</NavItem>
          <NavItem active={activeTab === 'voice_notes'} onClick={() => setActiveTab('voice_notes')}>Voice Notes</NavItem>
        </div>

        {/* Main Content Area */}
        <div className="p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AavidStudyApp;