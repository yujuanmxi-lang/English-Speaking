// 每个分类包含三种难度；题库可直接扩展，不需要后端。
window.BLOOM_SCENES = [
  ['daily','日常对话','☕','奶油咖啡馆','从一句问候，开启新的故事。',[
    ['Introduce yourself to someone you have just met. What do you like doing in your free time?','Hi! I’m Alex. It’s lovely to meet you. What do you enjoy doing?'],
    ['Tell a friend about a memorable weekend. What made it special?','How was your weekend? Did you do anything interesting?'],
    ['Do you think social media strengthens or weakens friendships? Explain with examples.','I wonder how technology is changing the way we stay connected.']]],
  ['campus','校园','🎓','紫藤校园','课堂之外，也有属于你的声音。',[
    ['Describe your favorite school subject and say why you like it.','Which class do you look forward to the most?'],
    ['Invite a classmate to work on a group project. Explain your idea and suggest a plan.','Shall we work together on the project? What topic interests you?'],
    ['Should universities prioritize practical skills or academic knowledge? Discuss both sides.','What should a university education really prepare us for?']]],
  ['ielts','雅思口语','✦','星光练习室','让想法展开，把答案说得更完整。',[
    ['Do you prefer mornings or evenings? Why?','Let’s talk about your daily routine.'],
    ['Describe a place you would like to visit. Say where it is, what you would do, and why you want to go.','You can organize your answer around where, what, and why.'],
    ['How does tourism affect local communities? Discuss economic and cultural impacts.','Let’s consider both the benefits and the challenges of tourism.']]],
  ['shopping','购物','🛍','玫瑰市集','挑选心动好物，也练习自信表达。',[
    ['Ask a shop assistant for a pink shirt in your size and ask about the price.','Hello! Can I help you find anything today?'],
    ['Return a faulty item politely. Explain the problem and request a refund or exchange.','What seems to be the problem with your purchase?'],
    ['Is buying sustainable products worth a higher price? Explain your opinion.','How do you balance your budget with responsible shopping?']]],
  ['travel','出行','✈','云端旅行站','带上勇气，去更远的地方。',[
    ['Ask for directions to the nearest train station.','Excuse me, where would you like to go?'],
    ['Your flight has been delayed. Ask about alternative flights and explain your needs.','I’m sorry about the delay. How can I assist you?'],
    ['Discuss how cities can reduce traffic congestion while keeping transport affordable.','What would your ideal urban transport system look like?']]]
].map(([id,category,icon,name,description,questions])=>({id,category,icon,name,description,questions}));
