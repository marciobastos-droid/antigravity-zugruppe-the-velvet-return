import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, TrendingUp, Heart } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Secção "Sobre Nós" para o website
 */
export default function AboutSection() {
  const values = [
    {
      icon: Users,
      title: "Equipa Experiente",
      description: "Profissionais qualificados com anos de experiência no mercado imobiliário",
      color: "blue"
    },
    {
      icon: Award,
      title: "Excelência",
      description: "Compromisso com a qualidade e satisfação em cada detalhe",
      color: "purple"
    },
    {
      icon: TrendingUp,
      title: "Resultados",
      description: "Histórico comprovado de transações bem-sucedidas",
      color: "green"
    },
    {
      icon: Heart,
      title: "Dedicação",
      description: "Apoio personalizado em todas as etapas do processo",
      color: "red"
    }
  ];

  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600"
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-slate-900 mb-4"
          >
            Sobre a ZuConnect
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 max-w-3xl mx-auto"
          >
            Somos uma empresa líder em serviços imobiliários, dedicada a conectar pessoas aos seus 
            imóveis ideais através de tecnologia inovadora e atendimento personalizado.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {values.map((value, idx) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[value.color]} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Mission Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-8 md:p-12 text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold mb-4">A Nossa Missão</h3>
          <p className="text-lg text-slate-200 max-w-3xl mx-auto leading-relaxed">
            Transformar a experiência imobiliária através da combinação perfeita entre tecnologia 
            de ponta e atendimento humano. Cada cliente merece encontrar não apenas uma propriedade, 
            mas o lugar onde pertence.
          </p>
        </motion.div>
      </div>
    </section>
  );
}