import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  const plans = [
    {
      id: 1,
      name: 'Starter',
      nameEn: 'Starter',
      nameRu: 'Начальный',
      requests: 20,
      price: 299,
      icon: 'Zap',
      popular: false,
      features: ['20 запросов', 'Базовая поддержка', 'История запросов']
    },
    {
      id: 2,
      name: 'Pro',
      nameEn: 'Pro',
      nameRu: 'Профессиональный',
      requests: 30,
      price: 399,
      icon: 'Sparkles',
      popular: true,
      features: ['30 запросов', 'Приоритетная поддержка', 'Расширенная история', 'Экспорт результатов']
    },
    {
      id: 3,
      name: 'Unlimited',
      nameEn: 'Unlimited',
      nameRu: 'Безлимитный',
      requests: null,
      price: 499,
      icon: 'Rocket',
      popular: false,
      features: ['Безлимитные запросы', 'VIP поддержка', 'Полная история', 'Приоритет обработки', 'API доступ']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1f2c] to-[#0f1117]">
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
