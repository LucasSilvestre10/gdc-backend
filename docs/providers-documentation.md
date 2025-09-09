# Documentação: Providers Personalizados no Projeto

## Por que existe o arquivo `providers.ts`?

### Contexto

Este projeto utiliza **TS.ED** como framework para APIs RESTful integrado com **Mongoose** para persistência de dados. Durante o desenvolvimento, encontramos um problema comum de injeção de dependência que exigiu uma solução específica.

### Problema Identificado

Ao usar o padrão de arquitetura em camadas (Repository → Service → Controller), o TS.ED estava injetando incorretamente o **Mongoose Model** (função) em vez da **classe Repository** nos services. Isso acontecia porque:

1. O decorator `@Model()` registra automaticamente o model no container de DI
2. O TS.ED pode confundir a injeção entre o Model e a classe Repository
3. O resultado era que o service recebia uma função (Mongoose Model) em vez de um objeto com métodos

### Erro Observado

```typescript
// Service tentava chamar método que não existia no Model
this.documentTypeRepository.list(...) // TypeError: list is not a function
```

**Logs de debug mostravam:**
```
Repository type: function              ← Deveria ser 'object'
Repository constructor: Function       ← Deveria ser 'DocumentTypeRepository'
Has findByName: undefined             ← Deveria ser 'function'
Has list: undefined                   ← Deveria ser 'function'
```

### Solução Implementada

Criamos o arquivo `src/config/providers.ts` que:

1. **Define um token personalizado** usando `Symbol()` para identificar unicamente o repositório
2. **Registra explicitamente** o repositório no container de DI do TS.ED
3. **Evita conflitos** com o registro automático do `@Model()`

```typescript
// Token único para evitar conflitos
export const DOCUMENT_TYPE_REPOSITORY_TOKEN = Symbol("DocumentTypeRepository");

// Registro explícito do repositório
registerProvider({
  provide: DOCUMENT_TYPE_REPOSITORY_TOKEN,
  useClass: DocumentTypeRepository
});
```

### Como Usar

#### No Service
```typescript
import { DOCUMENT_TYPE_REPOSITORY_TOKEN } from "../config/providers";
import { Inject } from "@tsed/di";

@Injectable()
export class DocumentTypeService {
  constructor(
    @Inject(DOCUMENT_TYPE_REPOSITORY_TOKEN) 
    private documentTypeRepository: DocumentTypeRepository
  ) {
    // Agora recebe corretamente a instância da classe Repository
  }
}
```

#### Resultado Após a Correção
```
Repository type: object                    ✅ Correto
Repository constructor: DocumentTypeRepository ✅ Correto  
Has findByName: function                   ✅ Correto
Has list: function                         ✅ Correto
```

### Benefícios da Solução

1. **Arquitetura Limpa**: Mantém a separação correta entre camadas
2. **Type Safety**: TypeScript consegue inferir tipos corretamente
3. **Testabilidade**: Facilita mock e teste unitário dos repositories
4. **Manutenibilidade**: Código mais claro e fácil de entender
5. **Escalabilidade**: Padrão pode ser aplicado a outros repositories

### Alternativas Consideradas

1. **Usar apenas `@Model()` no Repository**: ❌ Causa conflito de injeção
2. **Injetar MongooseService diretamente**: ❌ Viola separação de responsabilidades  
3. **Usar factory providers**: ✅ Funciona, mas mais complexo
4. **Token personalizado (escolhido)**: ✅ Simples e eficaz

### Padrão para Novos Repositories

Para manter consistência, novos repositories devem seguir este padrão:

```typescript
// 1. No providers.ts
export const NOVO_REPOSITORY_TOKEN = Symbol("NovoRepository");

registerProvider({
  provide: NOVO_REPOSITORY_TOKEN,
  useClass: NovoRepository
});

// 2. No service
constructor(
  @Inject(NOVO_REPOSITORY_TOKEN) private novoRepository: NovoRepository
) { }
```

### Impacto no Roadmap do Projeto

Esta solução permite que o desenvolvimento continue seguindo o roadmap planejado:
- ✅ **Dia 1**: Models implementados
- ✅ **Dia 2**: Repositories funcionando corretamente
- ✅ **Dia 3**: Services usando repositories sem erro
- 🎯 **Próximos**: Controllers e testes de integração

### Conclusão

O arquivo `providers.ts` é uma solução técnica necessária para garantir que a injeção de dependência do TS.ED funcione corretamente com Mongoose, mantendo a arquitetura do projeto organizada e seguindo as melhores práticas de desenvolvimento.

---

**Documento atualizado em**: 9 de setembro de 2025  
**Autor**: Sistema de desenvolvimento GDC Backend  
**Status**: Implementado e funcionando
