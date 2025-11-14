import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

const API_URLS = {
  auth: 'https://functions.poehali.dev/287d28fd-d88e-467f-b118-69f91e76dd7a',
  ai: 'https://functions.poehali.dev/c5dc4532-a336-457e-873d-bbcfbe7adc7f',
  payment: 'https://functions.poehali.dev/c91d17b8-4144-457d-992f-1104ed29ec3d',
  profile: 'https://functions.poehali.dev/b18e83cd-e46f-426f-8b2c-4557fa3d186a'
};

const Index = () => {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'app' | 'profile'>('landing');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestsLeft, setRequestsLeft] = useState(10);
  const [profileData, setProfileData] = useState<any>(null);
  const { toast } = useToast();

  const plans = [
    {
      id: 1,
      name: 'starter',
      nameRu: 'Начальный',
      requests: 20,
      price: 299,
      icon: 'Zap',
      popular: false,
      features: ['20 запросов', 'Базовая поддержка', 'История запросов']
    },
    {
      id: 2,
      name: 'pro',
      nameRu: 'Профессиональный',
      requests: 30,
      price: 399,
      icon: 'Sparkles',
      popular: true,
      features: ['30 запросов', 'Приоритетная поддержка', 'Расширенная история', 'Экспорт результатов']
    },
    {
      id: 3,
      name: 'unlimited',
      nameRu: 'Безлимитный',
      requests: null,
      price: 499,
      icon: 'Rocket',
      popular: false,
      features: ['Безлимитные запросы', 'VIP поддержка', 'Полная история', 'Приоритет обработки', 'API доступ']
    }
  ];

  const handleAuth = async () => {
    if (!codeSent) {
      setLoading(true);
      try {
        const res = await fetch(API_URLS.auth, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const data = await res.json();
        if (res.ok) {
          setCodeSent(true);
          toast({ title: 'Код отправлен!', description: `Демо-код: ${data.code}` });
        } else {
          toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Ошибка', description: 'Не удалось отправить код', variant: 'destructive' });
      }
      setLoading(false);
    } else {
      setLoading(true);
      try {
        const res = await fetch(API_URLS.auth, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code })
        });
        const data = await res.json();
        if (res.ok) {
          setUserId(data.userId);
          localStorage.setItem('userId', data.userId.toString());
          setCurrentView('app');
          toast({ title: 'Добро пожаловать!', description: 'Авторизация успешна' });
        } else {
          toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        }
      } catch (err) {
        toast({ title: 'Ошибка', description: 'Не удалось войти', variant: 'destructive' });
      }
      setLoading(false);
    }
  };

  const handleAskAI = async () => {
    if (!question.trim() || !userId) return;
    
    setLoading(true);
    setAnswer('');
    try {
      const res = await fetch(API_URLS.ai, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, question })
      });
      const data = await res.json();
      
      if (res.ok) {
        setAnswer(data.answer);
        setRequestsLeft(data.requestsLeft);
        toast({ title: 'Готово!', description: `Осталось запросов: ${data.requestsLeft}` });
      } else {
        if (data.needSubscription) {
          toast({ 
            title: 'Запросы закончились', 
            description: 'Выберите тариф для продолжения', 
            variant: 'destructive' 
          });
          setCurrentView('landing');
        } else {
          toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
        }
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось получить ответ', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleBuyPlan = async (planName: string) => {
    if (!userId) {
      setCurrentView('auth');
      toast({ title: 'Войдите в аккаунт', description: 'Для покупки нужна авторизация' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_URLS.payment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planType: planName })
      });
      const data = await res.json();
      
      if (res.ok) {
        window.open(data.paymentUrl, '_blank');
        toast({ title: 'Переход к оплате', description: 'Откроется страница ЮKassa' });
      } else {
        toast({ title: 'Ошибка', description: data.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось создать платеж', variant: 'destructive' });
    }
    setLoading(false);
  };

  const loadProfile = async () => {
    if (!userId) return;
    
    try {
      const res = await fetch(`${API_URLS.profile}?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setProfileData(data);
        setRequestsLeft(data.freeRequestsLeft);
      }
    } catch (err) {
      console.error('Failed to load profile', err);
    }
  };

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(parseInt(storedUserId));
      setCurrentView('app');
    }
  }, []);

  useEffect(() => {
    if (userId && currentView === 'profile') {
      loadProfile();
    }
  }, [userId, currentView]);

  if (currentView === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1f2c] to-[#0f1117] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-2 border-primary/30 animate-scale-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Icon name="Smartphone" size={32} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Вход в PulseAI
            </h2>
            <p className="text-muted-foreground mt-2">
              {codeSent ? 'Введите код из SMS' : 'Введите номер телефона'}
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="+7 999 123-45-67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={codeSent}
              className="text-center text-lg"
            />
            
            {codeSent && (
              <Input
                type="text"
                placeholder="Код из SMS"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            )}

            <Button
              onClick={handleAuth}
              disabled={loading || !phone}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            >
              {loading ? 'Загрузка...' : codeSent ? 'Войти' : 'Получить код'}
            </Button>

            <Button
              onClick={() => setCurrentView('landing')}
              variant="ghost"
              className="w-full"
            >
              Назад
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (currentView === 'app') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1f2c] to-[#0f1117]">
        <nav className="border-b border-border/50 backdrop-blur-sm bg-card/30 sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Icon name="Cpu" size={20} className="text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                PulseAI
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-sm">
                <Icon name="Zap" size={14} className="mr-1" />
                {requestsLeft} запросов
              </Badge>
              <Button onClick={() => setCurrentView('profile')} variant="ghost" size="sm">
                <Icon name="User" size={18} />
              </Button>
              <Button onClick={() => setCurrentView('landing')} variant="ghost" size="sm">
                <Icon name="CreditCard" size={18} />
              </Button>
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 bg-card/50 backdrop-blur-sm border-2 border-primary/20 animate-fade-in">
            <h2 className="text-3xl font-bold mb-6 text-center">Задайте вопрос нейросети</h2>
            
            <Textarea
              placeholder="Например: Реши уравнение 2x + 5 = 15"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-32 mb-4 text-lg"
            />

            <Button
              onClick={handleAskAI}
              disabled={loading || !question.trim()}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 mb-6"
              size="lg"
            >
              {loading ? 'Обрабатываю...' : 'Спросить ИИ'}
              <Icon name="Send" size={20} className="ml-2" />
            </Button>

            {answer && (
              <div className="p-6 bg-muted/30 rounded-lg border border-primary/20 animate-fade-in">
                <div className="flex items-start gap-3 mb-3">
                  <Icon name="Sparkles" size={24} className="text-primary flex-shrink-0" />
                  <h3 className="text-lg font-semibold">Ответ:</h3>
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (currentView === 'profile' && profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1f2c] to-[#0f1117]">
        <nav className="border-b border-border/50 backdrop-blur-sm bg-card/30">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Cpu" size={24} className="text-primary" />
              <span className="text-2xl font-bold">PulseAI</span>
            </div>
            <Button onClick={() => setCurrentView('app')} variant="ghost">
              <Icon name="ArrowLeft" size={18} className="mr-2" />
              Назад
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-4xl font-bold mb-8">Мой профиль</h1>
          
          <div className="grid gap-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Icon name="User" size={24} className="text-primary" />
                Информация
              </h3>
              <div className="space-y-2">
                <p><strong>Телефон:</strong> {profileData.phone}</p>
                <p><strong>Бесплатных запросов использовано:</strong> {profileData.freeRequestsUsed}/10</p>
                <p><strong>Дата регистрации:</strong> {new Date(profileData.memberSince).toLocaleDateString('ru-RU')}</p>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Icon name="BarChart3" size={24} className="text-primary" />
                Статистика
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{profileData.stats.totalRequests}</p>
                  <p className="text-sm text-muted-foreground">Всего запросов</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-secondary">{profileData.stats.totalTokens}</p>
                  <p className="text-sm text-muted-foreground">Токенов</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-3xl font-bold text-primary">{profileData.stats.totalSpent} ₽</p>
                  <p className="text-sm text-muted-foreground">Потрачено</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Icon name="CreditCard" size={24} className="text-primary" />
                Подписки
              </h3>
              {profileData.subscriptions.length > 0 ? (
                <div className="space-y-3">
                  {profileData.subscriptions.map((sub: any, idx: number) => (
                    <div key={idx} className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-semibold capitalize">{sub.planType}</p>
                        <p className="text-sm text-muted-foreground">
                          {sub.isUnlimited 
                            ? `Безлимит до ${new Date(sub.expiresAt).toLocaleDateString('ru-RU')}`
                            : `${sub.requestsUsed}/${sub.requestsTotal} запросов`
                          }
                        </p>
                      </div>
                      <Badge variant={sub.isActive ? 'default' : 'secondary'}>
                        {sub.isActive ? 'Активна' : 'Неактивна'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">У вас пока нет подписок</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1f2c] to-[#0f1117]">
      <nav className="border-b border-border/50 backdrop-blur-sm bg-card/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Icon name="Cpu" size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              PulseAI
            </span>
          </div>
          <Button onClick={() => setCurrentView('auth')} variant="outline">
            <Icon name="LogIn" size={18} className="mr-2" />
            Войти
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse-glow">
              <Icon name="Cpu" size={24} className="text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              PulseAI
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Выберите тариф и начните решать задачи с помощью ИИ
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            🎁 Первые 10 запросов бесплатно для всех!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative p-8 bg-card/50 backdrop-blur-sm border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer overflow-hidden ${
                plan.popular 
                  ? 'border-primary shadow-lg shadow-primary/20 animate-scale-in' 
                  : 'border-border hover:border-primary/50'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              {plan.popular && (
                <Badge className="absolute top-4 right-4 bg-gradient-to-r from-primary to-secondary text-white border-0">
                  ⭐ Популярный
                </Badge>
              )}

              <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 transition-opacity duration-300 ${hoveredPlan === plan.id ? 'opacity-100' : ''}`} />

              <div className="relative z-10">
                <div className="mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.popular ? 'from-primary to-secondary' : 'from-muted to-card'} flex items-center justify-center mb-4 transition-transform duration-300 ${hoveredPlan === plan.id ? 'scale-110 rotate-6' : ''}`}>
                    <Icon name={plan.icon as any} size={32} className={plan.popular ? 'text-white' : 'text-primary'} />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.nameRu}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">₽</span>
                  </div>
                  {plan.requests && (
                    <p className="text-muted-foreground mt-1">{plan.requests} запросов</p>
                  )}
                  {!plan.requests && (
                    <p className="text-muted-foreground mt-1">1 месяц безлимит</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Icon name="CheckCircle2" size={20} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  onClick={() => handleBuyPlan(plan.name)}
                  disabled={loading}
                  className={`w-full ${plan.popular ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90' : ''} transition-all duration-300`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  Выбрать тариф
                  <Icon name="ArrowRight" size={16} className="ml-2" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <p className="text-sm text-muted-foreground">
            Все платежи защищены ЮKassa 🔒
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
